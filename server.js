var express = require('express'),
passport = require('passport'),
bodyParser = require('body-parser'),
session = require('express-session'),
cookieParser = require('cookie-parser'),
MongoStore = require('connect-mongo')(session),
LocalStrategy = require('passport-local').Strategy;
var cookie = require('cookie');

var app = express();

var server = app.listen(8000,function () {
	console.log('server listening at port 8000');
});

var io = require('socket.io')(server);

// var sessionStore = new session.MemoryStore();

var sessionStore = new MongoStore({
    host:'localhost',
    port:'27017',
    db:'dashDb'
});

var sessionOptions = {
	store:sessionStore,
    secret: 'secret'
    // saveUninitialized: true,
    // resave: false,
    // store: sessionStore,
    // cookie : {
    //     httpOnly: true, 
    //     maxAge: 60000
    // }
}

app.use(express.static('public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

var users = [
	{
		uid:'rthanka',
		userPassword:'infy@6000',
		email:'rthanka@searshc.com'
	},
	{
		uid:'ssiraju',
		userPassword:'Apr@2015',
		email:'ssiraju@searshc.com'
	},
	{
		uid:'schand3',
		userPassword:'sears@2017',
		email:'schand3@searshc.com'
	},
	{
		uid:'amuthiy',
		userPassword:'arun@1903',
		email:'amuthiy@searshc.com'
	}
];

var getUser = function (username) {
	for (var i = users.length - 1; i >= 0; i--) {
		if (users[i].uid == username) {
			return users[i];
		} 
	};
	return null;
};

passport.use(new LocalStrategy(function (username,password,done) {
	var user = getUser(username);
	if (!user) {
		return done(null,false,{message:'unknown-user'});
	} else if (user.userPassword != password) {
		return done(null,false,{message:'incorrect-password'});
	} else {
		return done(null,{
			userName : user.uid,
			email : user.email
		});
	}
}));

passport.serializeUser(function (user,done) {
	done(null,user.userName);
});

passport.deserializeUser(function (userName,done) {
	var user = getUser(userName);
	if (!user) {
		return done(new Error('unknown-user-in-session'));
	} else {
		return done(null,{
			userName : user.uid,
			email : user.email
		});
	}
});

app.post('/login',function (req,res,next) {
	passport.authenticate('local',function (err,user,info) {
		if (!user) {
			res.send(info);
		} else {
			req.logIn(user,function (err) {
				if (err) {
					res.send({
						message:'error-while-session-creation',
						error:err
					})
				} else {
					res.send(user);
				}
			});
		}
	})(req,res,next);
});

app.post('/logout', function(req, res){
	req.logout();
	res.send({message:'user-signed-out'});
});

app.get('/user',function (req,res,next) {
	if (!req.user) {
		res.send({message:'user-not-signed-in'})
	} else {
		res.send(req.user);
	}
});


io.use(function (socket,next) {
	var clientCookie = socket.handshake.headers.cookie;
	if (clientCookie) {
		socket.sessionId = cookieParser.signedCookie(cookie.parse(clientCookie)['connect.sid'],'secret');
	}
	next();
});

io.on('connection',function (socket) {
	socket.emit('server-message',{message:'hi'});
	socket.on('client-message',function (message) {
		console.log('sessionId : '+socket.sessionId);
		sessionStore.get(socket.sessionId,function (err,session) {
			if (err) {
				console.log(err);
			} else {
				console.log('user : '+session.passport.user);
			}
		});
	});
	io.emit('server-broadcasted-message',{message:'new socket connected'});
});