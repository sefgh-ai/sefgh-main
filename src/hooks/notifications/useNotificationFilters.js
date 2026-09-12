import { useState } from "react";

export function useNotificationFilters() {
  const [filter, setFilter] = useState("inbox"); // 'inbox', 'saved', 'done'
  const [readFilter, setReadFilter] = useState("all"); // 'all', 'unread'
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(null); // 'success', 'info', 'warning', 'error', or null
  const [groupBy, setGroupBy] = useState("date"); // 'date', 'type', 'none'

  return {
    filter,
    setFilter,
    readFilter,
    setReadFilter,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    groupBy,
    setGroupBy,
  };
}
