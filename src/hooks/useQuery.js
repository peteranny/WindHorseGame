import { useCallback, useMemo } from "react";
import { useLocation, useHistory } from "react-router-dom";
import qs from "qs";

const useQuery = () => {
  const location = useLocation();
  const query = useMemo(
    () => qs.parse(location.search, { ignoreQueryPrefix: true }),
    [location.search]
  );

  const history = useHistory();
  const setQuery = useCallback(
    (query) => {
      history.push(qs.stringify(query, { addQueryPrefix: true }));
    },
    [history]
  );

  return [query, setQuery];
};

export default useQuery;
