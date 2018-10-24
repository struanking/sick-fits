import UpdateItem from '../components/UpdateItem';

const Update = ({ query }) => (
  <div>
    <h4>Update item with ID = {query.id}</h4>
    <UpdateItem  id={query.id} />
  </div>
);

export default Update;
