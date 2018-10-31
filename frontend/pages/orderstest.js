import PleaseSignin from "../components/PleaseSignin";
import OrderList from "../components/OrderList";

const OrderPageTest = props => (
  <div>
    <h4>Orders Test</h4>
    <PleaseSignin>
      <OrderList />
    </PleaseSignin>
  </div>
);

export default OrderPageTest;
