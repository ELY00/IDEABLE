const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('request')
const multer = require("multer");

const MongoClient = require('mongodb').MongoClient

var db

var user = null;

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/files/')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname)
    }
})

const upload = multer({
    storage: storage,
});

const uri = "mongodb+srv://test:test@ideable.ecesh.gcp.mongodb.net/<dbname>?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    db = client.db("test");
    // perform actions on the collection object
    // client.close();
});

app.listen(process.env.PORT || 3000, () => {
    console.log('listening on 3000')
})

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static('public'))

app.get('/Idea', (req, res) => {
    res.render("Idea");
})

app.get('/', (req, res) => {
    res.render("index");
})

app.get('/sign', (req, res) => {
    res.render("Sign");
})

app.get('/login', (req, res) => {
    res.render("Login", { x: '' })
})

app.get('/contact', (req, res) => {
    res.render("Contact");
})

app.get('/about', (req, res) => {
    res.render("About");
})

app.get('/temp', (req, res) => {
    if (!user) {
        res.redirect('/login')
        return console.log('Not logged in');
    }
    db.collection(user).find().toArray((err, result) => {
        if (err) return console.log(err)
            // console.log(result)
        res.render("Temp", {
            todos: result,
            username: user,
        })
    })
})

app.post('/signup', (req, res) => {
    db.collection('signup').save(req.body, (err, result) => {
        if (err) {
            res.redirect('/sign')
            console.log(err)
        }
        console.log('saved to database')
        res.redirect('/login')
    })
})

app.post('/logindata', (req, res) => {
    var token = req.body['g-recaptcha-response'];
    var secret_key = '6LfbfswZAAAAAH7Q9WY_1D475Kfdr55WZJArInKA';
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${token}`

    request(url, function(error, response) {
        if (error) {
            console.log(error);
            res.render('Login', { x: 'Error in captcha' });
        }
        // res.json(response.body)
        console.log(JSON.parse(response.body))
        if (JSON.parse(response.body).success) {
            db.collection('signup').findOne({ username: req.body.username, password: req.body.password }, (err, result) => {
                if (err) {
                    return console.log(err);
                }
                if (!result) {
                    res.render('Login', { x: 'Username or password fault' });
                    res.end();
                    return console.log('Username or password fault');
                } else {
                    user = req.body.username;
                    console.log(req.body.username + ' was loggedIn successfully!');
                    res.redirect('/temp')
                    return res.send()
                }
            });
        } else {
            res.render('Login', { x: 'Failed captcha' });
            return console.log('Failed captcha');
        }
        // return res.send();
    });
})

app.post('/logout', (req, res) => {
    user = null
    res.redirect('/login')
})

app.post('/addtodo', upload.any('todofile'), (req, res) => {
    var data = {}
    if (!req.body.todoname) {
        res.redirect('/temp')
        return console.log('Todo not added')
    } else
        data['todoname'] = req.body.todoname
    if (req.files.length != 0)
        data['todofile'] = req.files[0].originalname


    console.log(data)
    db.collection(user).insertOne(data, (err, result) => {
        if (err) return console.log(err)
        console.log('Todo added successfully!')
        res.redirect('/temp')
    })
})

app.post('/deltodo', (req, res) => {
    db.collection(user).findOneAndDelete(req.body, (err, result) => {
        if (err) return console.log(err)
        console.log('Todo deleted successfully!')
        res.redirect('/temp')
    })
})

app.post('/updatetodo', (req, res) => {
    db.collection(user)
        .findOneAndUpdate({ todoname: req.body.todoname }, {
            $set: {
                todoname: req.body.todonamenew,
            }
        }, (err, result) => {
            if (err) return res.send(err)
            console.log('Todo updated successfully!')
            res.redirect('/temp')
        })
})

client.close()