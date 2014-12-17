var express 				= require('express');
var ejs 						= require('ejs');
var app 						= express();
var path						= require('path');
var bodyParser 			= require('body-parser');
var cookieParser 		= require('cookie-parser');
var session 				= require('express-session');
var passportLocal 	= require('passport-local');
var passport 				= require('passport');
var db 							= require('./db.js')
var methodOverride 	= require('method-override');
var LocalStrategy 	= require('passport-local').Strategy;
var IndeedApi       = require('indeed-api');
var api             = require('indeed-api').getInstance("9438122058289035");
var request         = require('request');

app.set('view engine', 'ejs')
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({'extended':true}));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));
// Indeed API
var Api = function()
{
    this.getInstance = function(developerKey)
    {
        return new IndeedApi(developerKey);
    };
};

module.exports = new Api();

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	db.query('SELECT * FROM users WHERE id = $1', [id], function(err, dbRes) {
		if (!err) {
			done(err, dbRes.rows[0]);
		}
	});
  // findById(id, function (err, user) {
  //   done(err, user);
  // });
});


// Set-up routes
app.listen(5000, function() {
	console.log("*****Pipel1ne Server is Up!*****");
});

var localStrategy = new LocalStrategy(
  function(username, password, done) {
  	debugger
    db.query('SELECT * FROM users WHERE username = $1', [username], function(err, dbRes) {
    	var user = dbRes.rows[0];
    	console.log(username)

    	console.log(user);
    	debugger

      if (err) { return done(err); }
      if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
      if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
      return done(null, user);
    })
  }
);

passport.use(localStrategy);

// user routes
app.get('/', function(req, res) {
  res.render('index', { user: req.user});
});

app.get('/users/new', function(req, res) {
  res.render('users/new');
});

app.post('/users', function(req, res) {
  //add data to users table
var params = [req.body.first_name, req.body.last_name, req.body.city, req.body.state, req.body.service, req.body.rank, req.body.security_clearance, req.body.skills, req.body.username, req.body.password, req.body.email];

db.query('INSERT INTO users (first_name, last_name, city, state, service, rank, security_clearance, skills, username, password, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', params, function(err, dbRes) {
    if (!err) {
    res.redirect('/');
    }
  });
});

// app.get('/sessions/new', function(req, res) {
//   res.render('sessions/new');
// });

app.post('/', passport.authenticate('local', 
  {failureRedirect: '/'}), function(req, res) {
    res.redirect('/');
});

app.delete('/', function(req, res) {
  req.logout();
  res.redirect('/');
});

// Profile routes

// app.get('/profile/new', function(req, res) {
//   res.render('posts/new');
// });

// app.post('/profile', function(req, res) {
//   db.query('INSERT INTO posts (title, body, user_id) VALUES ($1, $2, $3)', [req.body.title, req.body.body, req.user.id], function(err, dbRes) {
//     if (!err) {
//       res.redirect('posts');
//     }
//   });
// });

// app.get('/posts', function(req, res) {
//   db.query('SELECT * FROM posts', function(err, dbRes) {
//     res.render('posts/index', { posts: dbRes.rows})
//   })
// });
app.get('/search', function(req, res) {
  res.render('search/search');
});

app.get('/profile/:id', function(req, res) {
  db.query('SELECT * FROM users WHERE id = $1', [req.params.id], function(err, dbRes) {
    if (!err) {
    res.render('profile/show', {user: dbRes.rows[0]});
    }
  });
});

app.get('/result', function(req, res) {
  var location = req.query['l'];
  request('http://api.indeed.com/ads/apisearch?publisher=9438122058289035&format=json&v=2&q=' + location, function (error, response, body) {
  
    var searchResults = JSON.parse(body);
    console.log(searchResults) //use to get searchResults keys in the console
      res.render('results/results', {searchResults: searchResults, user: req.user});
  })
}); 


app.get('/save_job/:jobkey', function(req, res) {
  var jobkey = req.params.jobkey;
  request(' http://api.indeed.com/ads/apigetjobs?publisher=9438122058289035&jobkeys='+ jobkey + '&format=json&v=2', function (error, response, body) {

    var searchResults = JSON.parse(body);
    console.log("Job title: " + searchResults.results[0].jobtitle, "Company: " + searchResults.results[0].company) //use to get searchResults keys in the console

    // var jobInfo = [res.searchResults[0].jobtitle, res.searchResults[0].company, res.searchResults.[0].formattedLocationFull, res.searchResults.results[0].date, res.searchResults.results[0].snippet, res.searchResults.results[0].source, res.searchResults.results[0].jobkey, res.searchResults.results[0].formattedRelativeTime];    
    
    // db.query('INSERT INTO jobs (title, company, location, date, snippet, source, job_key, date_posted) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', jobInfo, function(err, dbRes) {
    //   console.log("I made it this far");
    // });
  });
});

app.post('/result_action', function(req, res) {
  //add data to jobs table

var jobs = req.body;
console.log(jobs);
// create new path for saved jobs

// for (var i = 0; i < jobs.length; i++) {
//   console.log(jobs)
// };
});
// app.get('/posts/:id/edit', function(req, res) {
//   db.query('SELECT * FROM posts WHERE id = $1', [req.params.id], function(err, dbRes) {
//     if (!err) {
//     res.render('posts/edit', {post: dbRes.rows[0]});
//     }
//   });
// });

// app.patch('/posts/:id', function(req, res) {
//   db.query('UPDATE posts SET title = $1, body = $2 WHERE id = $3', [req.body.title, req.body.body, req.params.id], function(err, dbRes) {
//     if (!err) {
//       res.redirect('/posts/' + req.params.id);
//     }
//   });
// });

// app.delete('/posts/:id', function(req, res) {
//   db.query('DELETE FROM posts WHERE id = $1', [req.params.id], function(err, dbRes) {
//     if (!err) {
//       res.redirect('/posts');
//     }
//   });
// });
// this route logs you out after restarting server
// app.get('/posts/new', function(req, res) {
//  if (req.user) {
//  res.render('posts/new');
//  } else {
//  res.redirect('/');
//  }

// });