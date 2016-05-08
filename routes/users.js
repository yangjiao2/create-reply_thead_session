var express = require('express');
var router = express.Router();
var session = require('client-sessions');
var moment = require('moment');
var ejs = require('ejs');


var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect('mongodb://localhost/post');

var User = mongoose.model('user', { fullname: String,  username: String , password: String });
var Post = mongoose.model('post',
    {
      title: String,
      createdAt: { type: Date, default: Date.now, index: true },
      user: Object
    });

var PostMessage = mongoose.model('postmessage',
    {
      _post: {type: Schema.Types.ObjectId, ref: 'post'},
      message: String,
      createdAt: { type: Date, default: Date.now },
      user: Object
    });

router.use(session({
    cookieName: 'session',
    secret: 'lalalalalalala',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    maxAge: 6000,
    secure: false,
    cookie:
    {
    ephemeral: true, httpOnly: true
    }
}));

/* GET users listing. */
router.get('/login', function(req, res, next) {
  console.log('get')
  res.render('users/login', {message: ''});
});




router.post('/login', function(req, res) {
  console.log(req.body.newfullname);
  if (req.body.newfullname){
    console.log('post');
    var new_user = new User({
      fullname: req.body.newfullname,
      username: req.body.newusername,
      password: req.body.newpassword
    });
    new_user.save(function(err, doc){
      if (err) throw err;
      req.session.user = doc;
      res.redirect('/users/dashboard');
    })
  }
  else
  {
    User.findOne({username: req.body.username}, function (err, user) {
      if (!user) {
        res.render('users/login', {message: 'Invalid email or password.'});
      } else {
        if (req.body.password === user.password) {
          req.session.user = user;
          res.redirect('/users/dashboard');
        } else {
          res.render('users/login', {message: 'Invalid email or password.'});
        }
      }
    });
  }
});



router.get('/dashboard', function(req, res) {
  if (req.session && req.session.user) { // Check if session exists

    Post.find({}, function (err, docs) {
      if (err) throw err
      // res.status(200).json({data: docs});
      res.render('users/dashboard', {user: req.session.user, posts: docs});

    });

  }

});



router.get('/newpost', function(req, res) {
  if (req.session && req.session.user) { // Check if session exists
      res.render('post/newpost', {user: req.session.user});
  } else {
      res.redirect('/users/login');
  }

});



router.post('/newpost', function(req, res) {

  if (req.session && req.session.user) { // Check if session exists
    var new_post = new Post({
      title: req.body.thread,
      user: req.session.user
    });

    new_post.save(function (err, doc) {
      if (err) throw err;
      // res.status(200).json({data: doc});
      res.redirect("/users/dashboard");
    });
  }else {
      res.redirect('/users/login');
  }
});


// router.get('/viewpost/:id', function(req, res) {
//   if (req.session && req.session.user) { // Check if session exists
//     var id = req.params.id;
//     Post.findById(id, function(err, doc){
//       console.log(doc.title);
//       var searchpost = { title: doc.title,  createdAt: doc.createdAt , user: doc.user };
//       res.render('post/post', {post: searchpost, threads: {}});
//     });
//
//
//   }
//
// });




router.get('/viewpost/:id', function(req, res) {
  if (req.session && req.session.user) { // Check if session exists
    var id = req.params.id;
    Post.findById(id, function(err, doc){

      var searchpost = doc;//new Post({title: doc.title,  createdAt: doc.createdAt , user: doc.user }) ;
      PostMessage.find({_post:doc._id}, function (err1, doc1){

        if(err1) throw err1;
        // console.log(doc1.body);
        res.render('post/post', {post: searchpost, threads: doc1, edit_id:"", edit_thread: ""});
        // res.send(doc1);
      });
    });
  }else {
      res.redirect('/users/login');
  }
});


router.post('/viewpost/:id', function(req, res) {

  if (req.session && req.session.user) { // Check if session exists
    var id = req.params.id;
    Post.findById(id, function(err, doc){
      console.log(doc);
      var new_postthread = PostMessage({

        _post: doc,
        message: req.body.thread,
        user: req.session.user

      });

      new_postthread.save(function(err1, doc1) {
        if(err1){ throw err1}
        // res.status(200).json({data: doc});
        else {
            res.redirect("/users/viewpost/"+id);

        }
      });
    });
  }else {
      res.redirect('/users/login');
  }
});


router.get('/delete/:id', function(req, res) {
  if (req.session && req.session.user) {
        var id = req.params.id;
        console.log(id)
        Post.findById(id, function(err, doc){
        if (req.session.user._id === doc.user._id){
            console.log('in loop')
            PostMessage.find({_post:doc._id}, function (err1, doc1){
                PostMessage.findByIdAndRemove(doc1._id, function(err2, doc2){

                })
            });
            Post.findByIdAndRemove(id, function(err3, doc3){
                if(err3){ throw err3}
                else {
                    res.redirect("/users/dashboard");

                }
            })
        }else{
            res.redirect('/users/dashboard');
        }
    })
  }else {
      res.redirect('/users/login');
  }
});


router.get('/deletethread/:id', function(req, res) {
  if (req.session && req.session.user) {
    var id = req.params.id;
    PostMessage.findById(id, function (err, doc) {
      if (err) {
        throw err
      }else {
        if (req.session.user._id === doc.user._id){
          PostMessage.findByIdAndRemove(id, function(err1, doc1){
            Post.findById(doc1._post, function(err2, doc2){
              res.redirect("/users/viewpost/"+doc2._id);
            })
          }
          )
        }
      }
    });
  }else {
      res.redirect('/users/login');
  }
});

router.get('/editpost/:id', function(req, res) {
    if (req.session && req.session.user) { // Check if session exists
        var id = req.params.id;
        Post.findById(id, function(err, doc){

            var searchpost = doc;//new Post({title: doc.title,  createdAt: doc.createdAt , user: doc.user }) ;
            PostMessage.find({_post:doc._id}, function (err1, doc1){

                if(err1) throw err1;
                // console.log(doc1.body);
                res.render('post/post', {post: searchpost, threads: doc1, edit_id: id});
                // res.send(doc1);
            });
        });
    }else {
        res.redirect('/users/login');
    }
});


router.post('/editpost/:id', function(req, res) {
    if (req.session && req.session.user) { // Check if session exists
        var id = req.params.id;
        Post.findByIdAndUpdate(id, {$set: {
            title: req.body.title,
            user: req.session.user}}, function(err, doc){

            res.redirect('/users/viewpost/'+id);
        });
    }else {
        res.redirect('/users/login');
    }
});

router.get('/editthread/:id/:tid', function(req, res) {
    if (req.session && req.session.user) { // Check if session exists
        var id = req.params.id;
        var threadid = req.params.tid;
        console.log(id);
        console.log(threadid);
        Post.findById(id, function(err, doc){

            var searchpost = doc;//new Post({title: doc.title,  createdAt: doc.createdAt , user: doc.user }) ;
            PostMessage.find({_post:doc._id}, function (err1, doc1){

                if(err1) throw err1;
                // console.log(doc1.body);
                res.render('post/post', {post: searchpost, threads: doc1, edit_id: "", edit_thread: threadid});
                // res.send(doc1);
            });
        });
    }else {
        res.redirect('/users/login');
    }
});




router.post('/editthread/:id/:tid', function(req, res) {
    if (req.session && req.session.user) { // Check if session exists
        var id = req.params.id;
        var threadid = req.params.tid;
        PostMessage.findByIdAndUpdate(threadid, {$set: {
            message: req.body.message,
            user: req.session.user}}, function(err, doc){
            if (err) throw err;
            res.redirect('/users/viewpost/'+id);
        });
    }else {
        res.redirect('/users/login');
    }
});


router.get('/logout', function(req, res) {
    req.session.reset();
    res.redirect('/users/login');
});


module.exports = router;

