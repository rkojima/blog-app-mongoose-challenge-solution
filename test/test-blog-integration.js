// To be able to use `describe` and `it` 
const chai = require('chai');
const chaiHttp = require('chai-http');
// To generate random data
const faker = require('faker');
const mongoose = require('mongoose');

// I guess I don't need mocha

// To use should instead of typing chai.should();
const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
    // No significant difference between console.log vs console.info. 
    console.info('seeding blog data');
    const seedData = [];

    for (let i = 1; i <=10; i++) {
        seedData.push(generateBlogData());
    }

    // To return a promise
    // Can call insertMany because BlogPost from models is a mongoose model
    return BlogPost.insertMany(seedData);
}

function generateBlogData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        content: faker.lorem.paragraphs(),
        title: faker.lorem.words(),
        created: faker.date.recent(),
    };
}

// Deletes entire database, placed in `afterEach` so that 
// data is not persistent
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function() {

    // Returning promises instead of `done` callback
    // Before any test happens
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    // Before each endpoint test
    beforeEach(function() {
        return seedBlogData();
    });

    // after each endpoint test
    afterEach(function() {
        return tearDownDb();
    });

    // after all tests happen
    after(function() {
        return closeServer();
    });

    describe('GET endpoint', function() {
        it('should return all blog posts', function() {
            let res;
            // Constructing request to application or URL
            // Given chainable api to do a http VERB request(get, post, etc.)
            // that I want to invoke
            return chai.request(app)
            .get('/posts')
            // Returns promise that I could use in `.then`
            .then(function(_res) {
                // Assign res so that I could use for later
                res = _res;
                res.should.have.status(200);
                res.body.should.have.length.of.at.least(1);
                return BlogPost.count();
            })
            .then(function(count) {
                res.body.should.have.length.of(count);
                // Why doesn't BlogPost.count() work? Why does count work instead?
            });
        });

        it('should return blog post with same ID', function() {
            let resBlogPost;
            let resName;
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.a('array');
                    res.body.should.have.length.of.at.least(1);

                    res.body.forEach(function(post) {
                        post.should.be.a('object');
                        post.should.include.keys(
                            'id', 'author', 'title', 'content');
                    });
                    resBlogPost = res.body[0];
                    return BlogPost.findById(resBlogPost.id);
                })
                .then(function(post) {
                    resBlogPost.id.should.equal(post.id);
                    resBlogPost.author.should.equal(post.author.firstName + ' ' + post.author.lastName);
                    resBlogPost.title.should.equal(post.title);
                    resBlogPost.content.should.equal(post.content);
                });
        });
    });

    describe('POST endpoint', function() {
        it('should add new blog post', function() {
            const newBlogPost = generateBlogData();

            return chai.request(app)
            .post('/posts')
            .send(newBlogPost)
            .then(function(res) {
                res.should.have.status(201);
                res.should.be.json;
                res.body.should.be.a('object');
                res.body.should.include.keys(
                    'id', 'author', 'title', 'content');
                res.body.id.should.not.be.null;
                res.body.author.should.equal(newBlogPost.author.firstName + " " + newBlogPost.author.lastName);
                res.body.title.should.equal(newBlogPost.title);
                res.body.content.should.equal(newBlogPost.content);
                return BlogPost.findById(res.body.id);
            })
            .then(function(post) {
                console.log(newBlogPost.author);
                console.log(post.author);
                // post.author.should.deep.equal(newBlogPost.author);
                // This one doesn't work for some reason, even though newBlogPost.author
                // and post.author are essentially the same
                post.author.firstName.should.equal(newBlogPost.author.firstName);
                post.author.lastName.should.equal(newBlogPost.author.lastName);
                post.title.should.equal(newBlogPost.title);
                post.content.should.equal(newBlogPost.content);
            });
        });
    });

    describe('PUT endpoint', function() {
        it('should modify existing post with specified id', function() {
            const updatedPost = {
                content: 'Updated post here!',
                title: 'Updated Title Right Here!',
            };
            // What if you try to add a new key-value that shouldn't be there
            return BlogPost
                .findOne()
                .exec() 
                // Why can't you just use findOne()? 
                // Why do we use an .exec function without any parameters?
                // .exec() makes sure you get a promise, comes with .catch, etc.
                .then(function(post) {
                    updatedPost.id = post.id;
                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                        .send(updatedPost);
                })
                .then(function(res) {
                    res.should.have.status(204);
                    return BlogPost.findById(updatedPost.id).exec();
                })
                .then(function(post) {
                    post.content.should.equal(updatedPost.content);
                    post.title.should.equal(updatedPost.title);
                });
        });
    });

    describe('DELETE endpoint', function() {
        it('should delete post that was specified', function() {
            
            let postToDelete;

            return BlogPost
                .findOne()
                .exec()
                .then(function(post) {
                    postToDelete = post;
                    return chai.request(app)
                        .delete(`/posts/${postToDelete.id}`);
                })
                .then(function(res) {
                    res.should.have.status(204);
                    return BlogPost.findById(postToDelete.id)
                        .exec();
                })
                .then(function(post) {
                    should.not.exist(post);
                });
        });
    });
});