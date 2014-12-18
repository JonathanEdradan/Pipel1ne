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
// Passport Authentication
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

app.post('/', passport.authenticate('local', 
  {failureRedirect: '/'}), function(req, res) {
    res.redirect('/');
});
// Logout 
app.delete('/', function(req, res) {
  req.logout();
  res.redirect('/');
});

// Profile routes
app.get('/search', function(req, res) {
  res.render('search/search');
});

app.get('/profile/:id', function(req, res) {
  //SELECT owners.name, owners.age, properties.name, number_of_units FROM owners INNER JOIN properties ON owners.owner_id = properties.owner_id;
  db.query('SELECT * FROM users WHERE id = $1', [req.params.id], function(err, users) {
    if (!err) {
      db.query('SELECT * FROM jobs WHERE user_id = $1', [req.params.id], function(err, jobs) {
        if (!err) {
          res.render('profile/show', {jobs: jobs.rows, user: users.rows[0]});
        } else {
          console.log(err);
        }
      });
    } else {
      console.log(err);
    }
  });
});
// edit user profile
app.get('/users/edit', function(req, res) {
  db.query("SELECT * FROM users WHERE id = $1", [req.user.id], function(err, dbResult) {
    if (!err) {
      res.render('users/edit', { users: dbResult.rows[0] });
    } else {
      console.log(err);
    }
  });
});

app.patch('/users/edit', function(req, res) {
  var params = [req.body.first_name, req.body.last_name, req.body.city, req.body.state, req.body.service, req.body.rank, req.body.security_clearance, req.body.skills, req.body.username, req.body.password, req.body.email, req.user.id];

  db.query("UPDATE users SET first_name = $1, last_name = $2, city = $3, state = $4, service = $5, rank = $6, security_clearance = $7, skills = $8, username = $9, password = $10, email = $11 WHERE id = $12", params, function(err, dbResult) {
    if (!err) {
      res.redirect('/profile/' + req.user.id);
    }
  });
});
// Edit Saved Jobs
app.get('/jobs/edit', function(req, res) {
  db.query("SELECT * FROM users WHERE id = $1", [req.user.id], function(err, users) {
    if (!err) {
      db.query('SELECT * FROM jobs WHERE user_id = $1', [req.user.id], function(err, jobs) {
        if (!err) {
          res.render('jobs/edit', {jobs: jobs.rows, user: users.rows[0]});
        } else {
          console.log(err);
        }
      });
    } else {
      console.log(err);
    }
  });
});

app.get('/jobs/delete/:id', function(req, res) {
  var jobId = req.params;
  //jobId = {id: 50}
  
  var id = jobId["id"];
    console.log(id);
  
  db.query('DELETE FROM jobs WHERE id =' + id, function(err, dbRes) {
    if (!err) {
    console.log("Success");
    } else {
      console.log(err, "There is something wrong!!!!!!");
    }
  });
});
// Indeed Search
app.get('/result', function(req, res) {
  var location = req.query['l'];
  request('http://api.indeed.com/ads/apisearch?publisher=9438122058289035&format=json&v=2&q=' + location, function (error, response, body) {
  
    var searchResults = JSON.parse(body);
    console.log(searchResults) //use to get searchResults keys in the console
      res.render('results/results', {searchResults: searchResults, user: req.user});
  })
}); 
// Indeed Job Key Search
app.get('/save_job/:jobkey', function(req, res) {
  var jobkey = req.params.jobkey;
  request(' http://api.indeed.com/ads/apigetjobs?publisher=9438122058289035&jobkeys='+ jobkey + '&format=json&v=2', function (error, response, body) {
    if (error) {
      console.log(error);
    }
    var searchResults = JSON.parse(body);
    //use to get searchResults keys in the console
    console.log("Job title: " + searchResults.results[0].jobtitle, "Company: " + searchResults.results[0].company) 

     var jobInfo = [searchResults.results[0].jobtitle, searchResults.results[0].company, searchResults.results[0].formattedLocationFull, searchResults.results[0].date, searchResults.results[0].snippet, searchResults.results[0].source, searchResults.results[0].jobkey, searchResults.results[0].formattedRelativeTime, req.user.id];   
    
    db.query('INSERT INTO jobs (title, company, location, date, snippet, source, job_key, date_posted, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', jobInfo, function(err, dbRes) {
      if (!err) {
      console.log("I made it this far");
      } else {
        console.log(err);
      }
    });
  });
});

// Set-up Server
app.listen(5000, function() {
  console.log("*****Pipel1ne Server is Up!*****");
});