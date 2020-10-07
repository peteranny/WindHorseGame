import React from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import styles from "./styles.css";

const Screen = (props) => (
  <div className={cn(styles.screen, styles.props)} {...props} />
);

Screen.propTypes = {
  styles: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

export default Screen;
