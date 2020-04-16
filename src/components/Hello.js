import React, { useContext } from "react";
import PropTypes from "prop-types";
import MouseContext from "../contexts/MouseContext";
import styles from "./Hello.css";

const Hello = ({ n, setN }) => {
  const mouse = useContext(MouseContext);
  return (
    <div className={styles.hello}>
      <div> Hello world!</div>
      <div>n: {n}</div>
      <button onClick={() => setN(n + 1)}>Add</button>
      <div>
        mouse: ({mouse.x}, {mouse.y})
      </div>
    </div>
  );
};

Hello.propTypes = {
  n: PropTypes.number.isRequired,
  setN: PropTypes.func.isRequired,
};
export default Hello;
