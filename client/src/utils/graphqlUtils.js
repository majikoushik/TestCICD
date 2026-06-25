/**
 * Utility functions for GraphQL operations
 */

import axios from 'axios';
import { getToken } from './authUtils';

/**
 * Execute a GraphQL query against the server
 * @param {string} query - The GraphQL query string
 * @param {Object} variables - Variables for the GraphQL query
 * @returns {Promise<Object>} - The query result
 */
export const executeGraphQLQuery = async (query, variables = {}) => {
  try {
    const token = getToken();
    
    const response = await axios({
      url: '/graphql',
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      data: {
        query,
        variables
      }
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data;
  } catch (error) {
    console.error('GraphQL query error:', error);
    throw error;
  }
};

/**
 * Execute multiple GraphQL queries in a single request
 * @param {Array<Object>} queries - Array of {query, variables} objects
 * @returns {Promise<Array<Object>>} - Array of query results
 */
export const executeBatchQueries = async (queries) => {
  try {
    const token = getToken();
    
    const batchData = queries.map(({ query, variables = {} }) => ({
      query,
      variables
    }));
    
    const response = await axios({
      url: '/graphql/batch',
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      data: batchData
    });

    // Check for errors in any of the responses
    if (response.data.some(result => result.errors)) {
      const errorResult = response.data.find(result => result.errors);
      throw new Error(errorResult.errors[0].message);
    }

    return response.data;
  } catch (error) {
    console.error('GraphQL batch query error:', error);
    throw error;
  }
};
