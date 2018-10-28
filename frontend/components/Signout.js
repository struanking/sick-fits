import React, { Component } from "react";
import gql from "graphql-tag";
import { Mutation } from "react-apollo";
// import Error from "./ErrorMessage";
// import styled from "styled-components";
// import Head from "next/head";
// import Form from "./styles/Form";
import { CURRENT_USER_QUERY } from "./User";

const SIGNOUT_MUTATION = gql`
  mutation SIGNOUT_MUTATION {
    signOut {
      message
    }
  }
`;

const Signout = props => {
  return (
    <Mutation
      mutation={SIGNOUT_MUTATION}
      refetchQueries={[{ query: CURRENT_USER_QUERY }]}
    >
      {signOut => (
        <button type="submit" onClick={signOut}>
          Sign out
        </button>
      )}
    </Mutation>
  );
};

export default Signout;
