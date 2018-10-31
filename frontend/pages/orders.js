import PleaseSignin from "../components/PleaseSignin";
import OrderList from "../components/OrderList";

const OrderPage = props => (
  <div>
    <h4>Orders</h4>
    <PleaseSignin>
      <OrderList />
    </PleaseSignin>
  </div>
);

export default OrderPage;
