import React from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import styles from "./styles.css";

const Screen = ({ className, ...props }) => (
  <div className={cn(styles.screen, className)} {...props} />
);

Screen.propTypes = {
  className: PropTypes.string,
};

export default Screen;
