const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const schema = require('../schema');
const resolvers = require('../resolvers');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware
router.use(protect);

router.use('/', graphqlHTTP({
  schema: schema,
  rootValue: resolvers,
  graphiql: true // Enable GraphiQL interface for testing
}));

module.exports = router;
