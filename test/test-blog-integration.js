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

