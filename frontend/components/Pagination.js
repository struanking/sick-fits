import React, { Component } from 'react'
import { Query } from 'react-apollo';
import gql from 'graphql-tag';
import Error from './ErrorMessage';
import Head from 'next/head';
import Link from 'next/link';
import PaginationStyles from './styles/PaginationStyles';
import { perPage } from '../config';

const PAGINATION_QUERY = gql`
  query PAGINATION_QUERY {
    itemsConnection {
      aggregate {
        count
      }
    }
  }
`;

const UPDATE_ITEM_MUTATION = gql`
  mutation UPDATE_ITEM_MUTATION(
    $id: ID!,
    $title: String,
    $description: String,
    $price: Int
  ) {
    updateItem (
      id: $id,
      description: $description
      title: $title
      price: $price
    ) {
      id
      title
      description
      price
    }
  }
`;

const Pagination = props => (
  <Query query={PAGINATION_QUERY}>
    {({ data, loading, error }) => {
      if (error) return <Error error={error} />;
      if (loading) return <p>Loading...</p>;
      const count = data.itemsConnection.aggregate.count;
      const pages = Math.ceil(count / perPage);
      const page = props.page;
      return (
        <PaginationStyles>
          <Head>
            <title>Sick Fits! Page {page} of {pages}</title>
          </Head>
          <Link
            prefetch
            href={{
            pathname: 'items',
            query: { page: page - 1 }
          }}>
            <a className="prev" aria-disabled={page <= 1}>Prev</a>
          </Link>
          <p>Page {page} of {pages}</p>
          <p>{count} items total</p>
          <Link
            prefetch
            href={{
            pathname: 'items',
            query: { page: page + 1 }
          }}>
            <a className="next" aria-disabled={page >= pages}>Next</a>
          </Link>
        </PaginationStyles>
      );
    }}
  </Query>
)

export default Pagination;
export { UPDATE_ITEM_MUTATION };