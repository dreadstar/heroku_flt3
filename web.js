var async   = require('async');
var express = require('express');
var util    = require('util');

// create an express webserver
var app = express.createServer(
  express.logger(),
  express.static(__dirname + '/public'),
  express.bodyParser(),
  express.cookieParser(),
  // set this to a secret value to encrypt session cookies was 'secret123'
  express.session({ secret: process.env.SESSION_SECRET || '4eMy9dD4W1xHZ927231k295y42V4L65iUlM22Y5OHO76RV251j324535516pMx71Ix5Z7EExQhN25x4H864M84wldd685qI355Hs' }),
  require('faceplate').middleware({
    app_id: process.env.FACEBOOK_APP_ID,
    secret: process.env.FACEBOOK_SECRET,
    scope:  'user_likes,user_photos,user_photo_video_tags'
  })
);

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});

app.dynamicHelpers({
  'host': function(req, res) {
    return req.headers['host'];
  },
  'scheme': function(req, res) {
    return req.headers['x-forwarded-proto'] || 'http';
  },
  'url': function(req, res) {
    return function(path) {
      return app.dynamicViewHelpers.scheme(req, res) + app.dynamicViewHelpers.url_no_scheme(req, res)(path);
    }
  },
  'url_no_scheme': function(req, res) {
    return function(path) {
      return '://' + app.dynamicViewHelpers.host(req, res) + (path || '');
    }
  },
});

function render_page(req, res) {
  req.facebook.app(function(app) {
    req.facebook.me(function(user) {
      res.render('index.ejs', {
        layout:    false,
        req:       req,
        app:       app,
        user:      user
      });
    });
  });
}

function handle_facebook_request(req, res) {

  // if the user is logged in
  if (req.facebook.token) {

    async.parallel([
    /*  function(cb) {
        // query 4 friends and send them to the socket for this socket id
        req.facebook.get('/me/friends', { limit: 4 }, function(friends) {
          req.friends = friends;
          cb();
        });
      },
      function(cb) {
        // query 16 photos and send them to the socket for this socket id
        req.facebook.get('/me/photos', { limit: 16 }, function(photos) {
          req.photos = photos;
          cb();
        });
      },
      function(cb) {
        // query 4 likes and send them to the socket for this socket id
        req.facebook.get('/me/likes', { limit: 4 }, function(likes) {
          req.likes = likes;
          cb();
        });
      },
      function(cb) {
        // use fql to get a list of my friends that are using this app
        req.facebook.fql('SELECT uid, name, is_app_user, pic_square FROM user WHERE uid in (SELECT uid2 FROM friend WHERE uid1 = me()) AND is_app_user = 1', function(result) {
          req.friends_using_app = result;
          cb();
        });
      }, 
      function(cb) {
        // use fql to get a list of my friends that are using this app
        req.facebook.fql('SELECT flid, owner, name FROM friendlist WHERE owner=me()', function(result) {
          req.friendlist = result;
          cb();
        });
      }, */
       function(cb) {
        // use fql to get a list of my friends that are using this app
        req.facebook.fql('SELECT flid, owner, name FROM friendlist WHERE owner=me() order by name', function(result) {
          req.friendlist = result;
          cb();
        });
      }
    ], function() {
      render_page(req, res);
    });

  } else {
    render_page(req, res);
  }
}

function handle_fblist_request(req, res) {
  if (req.facebook.token) {

    async.parallel([
      
      
      function(cb) {
        // use fql to get a list of my friends that are using this app
        req.facebook.fql('SELECT flid, owner, name FROM friendlist WHERE owner=me() order by name', function(result) {
          req.friendlist = result;
          cb();
        });
      }
    ], function() {
      //render_page(req, res);
      res.render('index.ejs', req);
    });
    

  } else {
    render_page(req, res);
  }
}

//return the search results for search eventually will take a list of parameters to construct complex list query
function handle_fbsrchlist_request(req, res) {
  if (req.facebook.token) {

    async.parallel([
      
      
      function(cb) {
        // use fql to get a list of my friends that are using this app
        //'SELECT post_id, actor_id, target_id, message FROM stream WHERE source_id in (SELECT uid FROM friendlist_member WHERE 1=1 '+ req.params.qstr +') '
        if (req.param('view', '') == 'list') {
         var querystr='SELECT uid, name, pic_square FROM user WHERE uid in (SELECT uid FROM friendlist_member WHERE 1=1 '+ req.param('qstr', '')  +') ';
        }else{
          var querystr='SELECT post_id, actor_id, target_id, message,uid, name, pic_square  FROM stream , user WHERE source_id in (SELECT uid FROM friendlist_member WHERE 1=1 '+ req.param('qstr', '') +') and source_id=uid ';
        }
        req.facebook.fql(querystr, function(result) {
          req.friendlist_members = result;
          cb();
        });
      }
    ], function() {
      res.json(req.friendlist_members);
    });

  } else {
    render_page(req, res);
  }
}

app.get('/', handle_facebook_request);
// app.get('/list', handle_fblist_request);
app.post('/', handle_facebook_request);
app.post('/search', handle_fbsrchlist_request);
app.get('/search', handle_fbsrchlist_request);
var objectUrl = function (type, object) {
  return app_domain + '/' + type + '/' + object
}
/*
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.set('view options', {
    layout: false
  });
  app.helpers({
    objectUrl: objectUrl
  });
});

 
app.get('/', function(request, response) {
  response.send('Welcome to the cooking app!');
});

app.get('/list/:flist', function(request, response) {
  var data = dishes[request.params.dish];
  if (data) {
    data.type = app_ns + ':dish'
    data.url = objectUrl('dish', request.params.dish);
    data.dishes = dishes;
    data.app_id = app_id;
    response.render('object', data)
  } else {
    response.send(404);
  }
});

app.get('/stream/:flist', function(request, response) {
  var data = ingredients[request.params.ingredient];
  if (data) {
    data.type = app_ns + ':ingredient'
    data.url = objectUrl('ingredient', request.params.ingredient);
    data.ingredients = null;
    data.dishes = dishes;
    data.app_id = app_id;
    response.render('object', data)
  } else {
    response.send(404);
  }
});
*/
