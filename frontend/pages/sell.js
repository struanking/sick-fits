import Link from "next/link";
import CreateItem from "../components/CreateItem";
import PleaseSignin from "../components/PleaseSignin";

const Sell = props => (
  <PleaseSignin>
    <CreateItem />
  </PleaseSignin>
);

export default Sell;
