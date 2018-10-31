import Order from "../components/Order";
import PleaseSignin from "../components/PleaseSignin";

const OrderPage = props => (
  <div>
    <PleaseSignin>
      <Order id={props.query.id} />
    </PleaseSignin>
  </div>
);

export default OrderPage;
