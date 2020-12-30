var createError = require('http-errors');
var express = require('express');
var session = require('express-session')
var path = require('path');
var logger = require('morgan');
let cookieParser = require("cookie-parser");
var bearerToken = require('express-bearer-token');
var exphbs = require('express-handlebars');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var apiRouter = require('./routes/api')
var adminRouter = require('./routes/admin')


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Comment logger out to disable logging.

app.use(session({
  secret: 'uiiE1Nm1FC1FA#Y1qBZh7AVuKMLhAuaP',
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 600000
  }
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bearerToken());
app.use(cookieParser("3uw4SWfIX4LD"));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use('/api/', apiRouter)
app.use('/admin/', adminRouter)

app.use('/auth/', authRouter);
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
