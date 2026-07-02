import { useCallback, useMemo } from "react";
import { useLocation, useHistory } from "react-router-dom";

const useQuery = (): [URLSearchParams, (params: Record<string, string>) => void] => {
  const location = useLocation();
  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const history = useHistory();
  const setQuery = useCallback(
    (params: Record<string, string>) => {
      history.push({ search: new URLSearchParams(params).toString() });
    },
    [history]
  );

  return [query, setQuery];
};

export default useQuery;
