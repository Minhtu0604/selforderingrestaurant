import React, { useState, useEffect, useCallback } from "react";
import MenuBarStaff from "../../../components/layout/MenuBar_Staff.jsx";
import MenuBar from "../../../components/layout/MenuBar.jsx";
import axios from "axios";
import { useMemo } from "react";

const TableManagementStaff = () => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEmptyTableModalOpen, setIsEmptyTableModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [tableNotifications, setTableNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [socketError, setSocketError] = useState(null);

  // Assume userId is stored in localStorage or fetched from auth context
  const userId = localStorage.getItem("userId") || "1"; // Replace with actual userId retrieval logic

  useEffect(() => {
    let ws;
    let reconnectTimeout;
    let isMounted = true;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 3000;

    const connectWebSocket = () => {
      if (!isMounted || reconnectAttempts >= maxReconnectAttempts) {
        console.log("Max reconnect attempts reached or component unmounted");
        return;
      }

      console.log(
        `Attempting WebSocket connection (Attempt ${reconnectAttempts + 1})`
      );
      ws = new WebSocket(
        `ws://localhost:8080/ws/notifications?userType=STAFF&userId=${userId}`
      );

      ws.onopen = () => {
        console.log("WebSocket connected successfully");
        setSocket(ws);
        setSocketError(null);
        reconnectAttempts = 0;
        clearTimeout(reconnectTimeout);
        // Fetch initial notifications via REST since server doesn't handle INIT_NOTIFICATIONS
        fetchAllNotifications();
      };

      ws.onmessage = (event) => {
        try {
          if (typeof event.data !== "string") {
            throw new Error("Received non-string WebSocket message");
          }
          const message = JSON.parse(event.data);
          console.log("Received WebSocket message:", message);

          // Server sends NotificationResponseDTO directly
          if (message.notificationId && message.tableNumber !== undefined) {
            setTableNotifications((prev) => {
              // Check if notification already exists
              const exists = prev.some(
                (n) => n.notificationId === message.notificationId
              );
              if (exists) {
                // Update existing notification (e.g., for mark-as-read)
                console.log(`Updating notification ${message.notificationId}`);
                return prev.map((n) =>
                  n.notificationId === message.notificationId
                    ? { ...n, ...message } // Merge to preserve fields
                    : n
                );
              } else {
                // Add new notification
                console.log(
                  `Adding new notification ${message.notificationId}`
                );
                return [...prev, message];
              }
            });
          } else if (message === "PONG") {
            console.log("Received PONG from server");
          } else {
            console.warn("Unrecognized WebSocket message:", message);
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
          setSocketError("Failed to process notification");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setSocketError("Failed to connect to notifications server");
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setSocket(null);
        if (isMounted && reconnectAttempts < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
          reconnectAttempts++;
          console.log(
            `Scheduling reconnect in ${delay}ms (Attempt ${reconnectAttempts})`
          );
          reconnectTimeout = setTimeout(() => {
            connectWebSocket();
          }, delay);
        }
      };

      // Send periodic PING to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log("Sending PING");
          ws.send(JSON.stringify({ type: "PING" }));
        }
      }, 30000);
    };

    connectWebSocket();

    // Periodic sync for unread notifications
    const syncInterval = setInterval(() => {
      if (isMounted && tables.length > 0) {
        console.log("Performing periodic notification sync");
        fetchUnreadNotifications();
      }
    }, 120000); // Sync every 2 minutes

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      clearInterval(syncInterval);
      if (ws) {
        console.log("Closing WebSocket during cleanup");
        ws.close();
      }
    };
  }, [tables, userId]);

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          (error.response?.status === 401 || error.response?.status === 403) &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          try {
            setAuthError("Your session has expired. Please log in again.");
            return Promise.reject(error);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const unreadNotificationsByTable = useMemo(() => {
    const result = tables.reduce((acc, table) => {
      acc[table.id] = tableNotifications.filter(
        (n) => n.tableNumber.toString() === table.id.toString() && !n.isRead
      ).length;
      return acc;
    }, {});
    console.log("Calculated unreadNotificationsByTable:", result);
    return result;
  }, [tableNotifications, tables]);

  const executeGraphQL = async (query, variables = {}) => {
    try {
      const response = await axios.post(
        "http://localhost:8080/graphql",
        { query, variables },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data;
    } catch (error) {
      console.error("GraphQL Error:", error);
      throw error;
    }
  };

  const API = {
    get: (url) => axios.get(`http://localhost:8080${url}`),
    post: (url, data) => axios.post(`http://localhost:8080${url}`, data),
    put: (url, data) => axios.put(`http://localhost:8080${url}`, data),
    delete: (url) => axios.delete(`http://localhost:8080${url}`),
  };

  const fetchOrdersGraphQL = useCallback(async () => {
    try {
      const query = `
        query GetAllOrders {
          orders {
            orderId
            customerName
            tableNumber
            status
            totalAmount
            paymentStatus
            items {
              dishId
              dishName
              quantity
              price
              notes
            }
          }
        }
      `;
      const result = await executeGraphQL(query);
      if (!result || !result.orders) {
        throw new Error("Invalid GraphQL response structure");
      }
      return result.orders;
    } catch (err) {
      console.error("Error fetching orders via GraphQL:", err);
      throw err;
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrderLoading(true);
    setOrderError(null);

    try {
      const ordersData = await fetchOrdersGraphQL();
      console.log("Orders from GraphQL:", ordersData);
      setOrders(ordersData);

      setTables((prevTables) =>
        prevTables.map((table) => {
          const tableOrders = ordersData.filter(
            (order) => order.tableNumber?.toString() === table.id.toString()
          );
          return { ...table, orders: tableOrders };
        })
      );

      return ordersData;
    } catch (err) {
      console.error("GraphQL orders fetch failed:", err);
      try {
        const response = await API.get("/api/orders");
        console.log("Orders from REST:", response.data);
        setOrders(response.data);

        setTables((prevTables) =>
          prevTables.map((table) => {
            const tableOrders = response.data.filter(
              (order) => order.tableNumber?.toString() === table.id.toString()
            );
            return { ...table, orders: tableOrders };
          })
        );

        return response.data;
      } catch (restErr) {
        console.error("REST orders fetch also failed:", restErr);
        setOrderError("Failed to load orders data");
        return [];
      }
    } finally {
      setOrderLoading(false);
    }
  }, [fetchOrdersGraphQL]);

  const fetchOrderByIdGraphQL = useCallback(async (orderId) => {
    try {
      const query = `
        query GetOrder($orderId: ID!) {
          order(orderId: $orderId) {
            orderId
            customerName
            tableNumber
            status
            totalAmount
            paymentStatus
            items {
              dishId
              dishName
              quantity
              price
              notes
            }
          }
        }
      `;
      const variables = { orderId: orderId.toString() };
      const result = await executeGraphQL(query, variables);
      if (!result || !result.order) {
        throw new Error("Invalid GraphQL response structure");
      }
      return result.order;
    } catch (err) {
      console.error(`Error fetching order ${orderId} via GraphQL:`, err);
      throw err;
    }
  }, []);

  const fetchOrderById = useCallback(
    async (orderId) => {
      if (!orderId) {
        console.error("Cannot fetch order without orderId");
        setOrderError("Invalid order ID");
        return null;
      }

      setOrderLoading(true);
      setOrderError(null);

      try {
        const orderData = await fetchOrderByIdGraphQL(orderId);
        setCurrentOrder(orderData);
        return orderData;
      } catch (err) {
        console.error("GraphQL order fetch failed:", err);
        try {
          const response = await API.get(`/api/orders/${orderId}`);
          setCurrentOrder(response.data);
          return response.data;
        } catch (restErr) {
          console.error("REST order fetch also failed:", restErr);
          setOrderError(`Failed to load order #${orderId}`);
          return null;
        }
      } finally {
        setOrderLoading(false);
      }
    },
    [fetchOrderByIdGraphQL]
  );

  const fetchOrdersByTableId = useCallback(async (tableId) => {
    if (!tableId) {
      console.error("Cannot fetch orders without tableId");
      setOrderError("Invalid table ID");
      return [];
    }

    setOrderLoading(true);
    setOrderError(null);

    try {
      const response = await API.get(`/api/staff/tables/${tableId}`);
      return response.data || [];
    } catch (err) {
      console.error(`Error fetching orders for table ${tableId}:`, err);
      setOrderError(`Failed to load orders for table #${tableId}`);
      return [];
    } finally {
      setOrderLoading(false);
    }
  }, []);

  const updateOrderStatusGraphQL = useCallback(async (orderId, status) => {
    try {
      const mutation = `
        mutation UpdateOrderStatus($orderId: ID!, $input: UpdateOrderStatusInput!) {
          updateOrderStatus(orderId: $orderId, input: $input)
        }
      `;
      const variables = {
        orderId: orderId.toString(),
        input: { status },
      };
      const result = await executeGraphQL(mutation, variables);
      return result.updateOrderStatus;
    } catch (err) {
      console.error("Error updating order status with GraphQL:", err);
      throw err;
    }
  }, []);

  const updateOrderStatus = useCallback(
    async (orderId, status) => {
      if (!orderId) {
        console.error("Cannot update order without orderId");
        setOrderError("Invalid order ID");
        return false;
      }

      setOrderLoading(true);
      setOrderError(null);

      try {
        const result = await updateOrderStatusGraphQL(orderId, status);
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.orderId === orderId ? { ...order, status } : order
          )
        );
        return result;
      } catch (err) {
        console.error("GraphQL order status update failed:", err);
        try {
          const response = await API.put(`/api/orders/${orderId}/status`, {
            status,
          });
          setOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.orderId === orderId ? { ...order, status } : order
            )
          );
          return true;
        } catch (restErr) {
          console.error("REST order status update also failed:", restErr);
          setOrderError(`Failed to update status for order #${orderId}`);
          return false;
        }
      } finally {
        setOrderLoading(false);
      }
    },
    [updateOrderStatusGraphQL]
  );

  const deleteOrderGraphQL = useCallback(async (orderId) => {
    try {
      const mutation = `
        mutation DeleteOrder($orderId: String!) {
          deleteOrder(orderId: $orderId)
        }
      `;
      const variables = { orderId: orderId.toString() };
      const result = await executeGraphQL(mutation, variables);
      if (!result || !result.deleteOrder) {
        throw new Error("Invalid GraphQL response structure");
      }
      return result.deleteOrder;
    } catch (err) {
      console.error(`Error deleting order ${orderId} via GraphQL:`, err);
      throw err;
    }
  }, []);

  const deleteOrder = useCallback(
    async (orderId) => {
      if (!orderId) {
        console.error("Cannot delete order without orderId");
        setOrderError("Invalid order ID");
        return false;
      }

      setOrderLoading(true);
      setOrderError(null);

      try {
        await deleteOrderGraphQL(orderId);
        const updatedOrders = await fetchOrders();

        if (selectedTable) {
          const tableOrders = updatedOrders.filter(
            (order) =>
              order.tableNumber.toString() === selectedTable.id.toString()
          );
          setSelectedTable((prev) => ({
            ...prev,
            orders: tableOrders,
          }));
        }

        const response = await API.get("/api/staff/tables");
        if (response.data) {
          const mappedTables = response.data.map((table) => ({
            id: table.table_id,
            status: table.status?.toLowerCase() || "available",
            capacity: table.capacity,
            orders: updatedOrders.filter(
              (order) =>
                order.tableNumber.toString() === table.table_id.toString()
            ),
          }));
          setTables(mappedTables);
        }

        return true;
      } catch (err) {
        console.error(`Failed to delete order #${orderId}:`, err);
        setOrderError(`Failed to delete order #${orderId}`);
        return false;
      } finally {
        setOrderLoading(false);
      }
    },
    [deleteOrderGraphQL, fetchOrders, selectedTable]
  );

  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);

        const response = await API.get("/api/staff/tables");
        if (!response.data) {
          throw new Error("No tables data returned from API");
        }

        const mappedTables = response.data.map((table) => ({
          id: table.table_id,
          status: table.status?.toLowerCase() || "available",
          capacity: table.capacity,
          orders: [],
        }));

        setTables((prev) => {
          // Only update if the data has changed to avoid infinite loops
          if (JSON.stringify(prev) !== JSON.stringify(mappedTables)) {
            return mappedTables;
          }
          return prev;
        });
        await fetchOrders();
      } catch (err) {
        console.error("Error fetching tables:", err);
        if (err.response?.status === 403) {
          setError(
            "You don't have permission to access this resource. Please check your authentication."
          );
        } else {
          setError("Failed to load tables. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, [fetchOrders]);

  const ordersByTable = useMemo(() => {
    return orders.reduce((acc, order) => {
      if (order.tableNumber) {
        const tableId = order.tableNumber.toString();
        if (!acc[tableId]) {
          acc[tableId] = [];
        }
        acc[tableId].push(order);
      }
      return acc;
    }, {});
  }, [orders]);

  useEffect(() => {
    if (orders.length === 0 || tables.length === 0) return;

    const updatedTables = tables.map((table) => {
      const tableId = table.id.toString();
      const tableOrders = ordersByTable[tableId] || [];
      let updatedStatus = table.status;

      console.log(`Table ${tableId}:`, {
        orders: tableOrders,
        currentStatus: table.status,
      });

      if (tableOrders.length === 0) {
        updatedStatus = "available";
      } else {
        const hasUnpaidOrders = tableOrders.some(
          (order) => order.paymentStatus?.toUpperCase() !== "PAID"
        );
        updatedStatus = hasUnpaidOrders ? "occupied" : "available";
      }

      if (
        updatedStatus !== table.status ||
        JSON.stringify(table.orders) !== JSON.stringify(tableOrders)
      ) {
        return {
          ...table,
          status: updatedStatus,
          orders: tableOrders,
        };
      }
      return table;
    });

    if (JSON.stringify(updatedTables) !== JSON.stringify(tables)) {
      setTables(updatedTables);
    }
  }, [ordersByTable, tables]);

  const fetchTableNotifications = async (tableId) => {
    if (!tableId) {
      console.error("Cannot fetch notifications for undefined table ID");
      setNotificationsError("Invalid table selected");
      return;
    }

    try {
      setNotificationsLoading(true);
      setNotificationsError(null);

      const response = await API.get(`/api/notifications/table/${tableId}`);
      console.log(`Fetched notifications for table ${tableId}:`, response.data);
      const notifications = response.data;

      setTableNotifications((prev) => {
        // Remove existing notifications for this table to avoid duplicates
        const otherNotifications = prev.filter(
          (n) => n.tableNumber !== tableId
        );
        return [...otherNotifications, ...notifications];
      });
    } catch (err) {
      console.error(`Error fetching notifications for table ${tableId}:`, err);
      setNotificationsError("Failed to load notifications. Please try again.");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsError(null);

      const notificationsPromises = tables.map((table) =>
        API.get(`/api/notifications/table/${table.id}`)
          .then((response) => {
            console.log(`Notifications for table ${table.id}:`, response.data);
            return response.data.filter((n) => !n.isRead);
          })
          .catch((err) => {
            console.error(
              `Error fetching notifications for table ${table.id}:`,
              err
            );
            return [];
          })
      );

      const notificationsArrays = await Promise.all(notificationsPromises);
      const allNotifications = notificationsArrays
        .flat()
        .filter((n) => n.notificationId && typeof n.isRead === "boolean");

      console.log("Fetched unread notifications:", allNotifications);
      setTableNotifications((prev) => {
        // Merge new notifications, updating existing ones
        const notificationMap = new Map();
        [...prev, ...allNotifications].forEach((n) => {
          notificationMap.set(n.notificationId, n);
        });
        return Array.from(notificationMap.values());
      });
    } catch (err) {
      console.error("Error fetching unread notifications:", err);
      setNotificationsError("Failed to load unread notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchAllNotifications = async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsError(null);

      const notificationsPromises = tables.map((table) =>
        API.get(`/api/notifications/table/${table.id}`)
          .then((response) => {
            console.log(`Notifications for table ${table.id}:`, response.data);
            return response.data;
          })
          .catch((err) => {
            console.error(
              `Error fetching notifications for table ${table.id}:`,
              err
            );
            return [];
          })
      );

      const notificationsArrays = await Promise.all(notificationsPromises);
      const allNotifications = notificationsArrays
        .flat()
        .filter((n) => n.notificationId && typeof n.isRead === "boolean");

      console.log("All notifications fetched:", allNotifications);
      setTableNotifications(allNotifications);
    } catch (err) {
      console.error("Error fetching all notifications:", err);
      setNotificationsError("Failed to load notifications");
      setTableNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    if (!notificationId) {
      console.error("Cannot mark undefined notification as read");
      return;
    }

    try {
      console.log(`Marking notification ${notificationId} as read`);
      // Optimistically update local state
      setTableNotifications((prev) =>
        prev.map((notification) =>
          notification.notificationId === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      // Send request to server
      await API.put(`/api/notifications/${notificationId}/read`);
    } catch (err) {
      console.error(
        `Error marking notification ${notificationId} as read:`,
        err
      );
      setNotificationsError("Failed to mark notification as read");
      // Revert optimistic update and sync
      fetchUnreadNotifications();
    }
  };

  const toggleNotificationModal = async (e, table) => {
    e.stopPropagation();
    if (!table || !table.id) {
      console.error("Cannot toggle notification modal for undefined table");
      return;
    }

    console.log(`Toggling notification modal for table ${table.id}`);
    setSelectedTable(table);
    setCurrentPage(1);

    if (!isNotificationModalOpen) {
      await fetchTableNotifications(table.id);
    }

    setIsNotificationModalOpen(!isNotificationModalOpen);
  };

  const handleSelectTable = async (table) => {
    if (!table || !table.id) {
      console.error("Cannot select undefined table");
      return;
    }

    console.log(`Selecting table ${table.id}`);
    setSelectedTable({ ...table, orders: table.orders || [] });

    if (table.status === "occupied") {
      setOrderLoading(true);
      try {
        const tableOrders = await fetchOrdersByTableId(table.id);
        setSelectedTable((prev) => ({
          ...prev,
          orders: tableOrders || [],
        }));
      } catch (err) {
        console.error(`Failed to fetch orders for table ${table.id}:`, err);
        setOrderError("Failed to load orders");
      } finally {
        setOrderLoading(false);
      }
    }
  };

  const fetchUnpaidOrdersByTable = useCallback(
    async (tableId) => {
      if (!tableId) {
        console.error("Cannot fetch orders without tableId");
        setOrderError("Invalid table ID");
        return [];
      }

      setOrderLoading(true);
      setOrderError(null);

      try {
        const ordersData = await fetchOrdersGraphQL();
        if (!ordersData) {
          console.error("fetchOrdersGraphQL returned null or undefined");
          return [];
        }
        const unpaidOrders = ordersData.filter(
          (order) =>
            order.tableNumber?.toString() === tableId.toString() &&
            order.paymentStatus?.toUpperCase() === "UNPAID"
        );
        console.log(`Unpaid orders for table ${tableId}:`, unpaidOrders);
        return unpaidOrders || [];
      } catch (err) {
        console.error(
          `Error fetching unpaid orders for table ${tableId}:`,
          err
        );
        setOrderError(`Failed to load unpaid orders for table #${tableId}`);
        return [];
      } finally {
        setOrderLoading(false);
      }
    },
    [fetchOrdersGraphQL]
  );

  const handleShowDishModal = async (table) => {
    if (!table || !table.id) {
      console.error("Cannot show dish modal for undefined table");
      setOrderError("Invalid table selected");
      return;
    }

    console.log(`Showing dish modal for table ${table.id}`);
    const initialTable = { ...table, orders: table.orders || [] };
    setSelectedTable(initialTable);
    setIsDishModalOpen(true);

    setOrderLoading(true);
    try {
      const unpaidOrders = await fetchUnpaidOrdersByTable(table.id);
      setSelectedTable((prev) => ({
        ...prev,
        orders: unpaidOrders || [],
      }));
    } catch (err) {
      console.error(
        `Failed to fetch unpaid orders for table ${table.id}:`,
        err
      );
      setOrderError("Failed to load unpaid orders");
      setSelectedTable((prev) => ({
        ...prev,
        orders: [],
      }));
    } finally {
      setOrderLoading(false);
    }
  };

  const handleShowPaymentModal = () => {
    console.log("Showing payment modal");
    setIsDishModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    if (!selectedTable || !selectedTable.id) {
      console.error("Cannot update status for undefined table");
      return;
    }

    console.log(`Processing payment success for table ${selectedTable.id}`);
    try {
      await API.put(`/api/staff/tables/${selectedTable.id}`, {
        status: "AVAILABLE",
      });

      if (selectedTable.orders && selectedTable.orders.length > 0) {
        for (const order of selectedTable.orders) {
          try {
            await API.put(`/api/orders/${order.orderId}/payment`, {
              paymentStatus: "PAID",
            });
          } catch (err) {
            console.error(
              `Error updating payment for order ${order.orderId}:`,
              err
            );
          }
        }
      }

      setTables((prevTables) =>
        prevTables.map((table) =>
          table.id === selectedTable.id
            ? { ...table, status: "available", orders: [] }
            : table
        )
      );

      setIsPaymentModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error("Error updating table status:", err);
      setIsPaymentModalOpen(false);
      setIsSuccessModalOpen(true);
    }
  };

  const handleShowEmptyTableModal = () => {
    console.log("Showing empty table modal");
    setIsEmptyTableModalOpen(true);
  };

  const handlePrintReceipt = () => {
    console.log("Printing receipt");
    setIsBillModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const calculateTotalFromOrders = (orders) => {
    if (!orders || orders.length === 0) return 0;

    return orders.reduce((sum, order) => {
      return sum + (parseFloat(order.totalAmount) || 0);
    }, 0);
  };

  const totalAmount = selectedTable?.orders
    ? calculateTotalFromOrders(selectedTable.orders)
    : 0;

  const emptyTables = tables.filter((table) => table.status === "available");

  const renderNotificationModal = () => {
    if (!isNotificationModalOpen || !selectedTable) return null;

    const itemsPerPage = 5;
    const tableSpecificNotifications = tableNotifications.filter(
      (notification) => notification.tableNumber === selectedTable.id
    );
    const totalPages = Math.ceil(
      tableSpecificNotifications.length / itemsPerPage
    );

    const sortedNotifications = [...tableSpecificNotifications].sort(
      (a, b) => new Date(b.createAt) - new Date(a.createAt)
    );
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentNotifications = sortedNotifications.slice(
      indexOfFirstItem,
      indexOfLastItem
    );

    const formatDateTime = (isoString) => {
      try {
        const date = new Date(isoString);
        return date.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "Invalid date";
      }
    };

    const getPaginationButtons = () => {
      const maxButtons = 5;
      const buttons = [];
      let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);

      if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        buttons.push(
          <button
            key={i}
            onClick={() => setCurrentPage(i)}
            className={`px-3 py-1 rounded ${
              currentPage === i
                ? "!bg-blue-400 text-white"
                : "text-blue-600 hover:bg-blue-100"
            }`}
          >
            {i}
          </button>
        );
      }

      return buttons;
    };

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
        ></div>
        <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl mx-auto p-6 flex flex-col max-h-[80vh] relative z-50">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-xl font-semibold">
              Notifications for Table {selectedTable.id}
            </h2>
            <button
              onClick={() => setIsNotificationModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {notificationsLoading && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">
                  Loading notifications...
                </span>
              </div>
            )}
            {notificationsError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                {notificationsError}
              </div>
            )}
            {!notificationsLoading && !notificationsError && (
              <>
                {currentNotifications.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No notifications for this table
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {currentNotifications.map((notification) => (
                      <li
                        key={notification.notificationId}
                        className={`py-4 ${
                          !notification.isRead ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-800">
                              {notification.title}
                            </h3>
                            <p className="mt-1 text-gray-600">
                              {notification.content}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(notification.createAt)}
                          </span>
                        </div>
                        {!notification.isRead && (
                          <button
                            onClick={() =>
                              markNotificationAsRead(
                                notification.notificationId
                              )
                            }
                            className="!bg-blue-600 mt-2 text-sm text-white hover:bg-blue-700 font-medium py-1 px-3 rounded"
                          >
                            Mark as Read
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
          {!notificationsLoading && !notificationsError && (
            <div className="mt-4 pt-3 border-t">
              {tableSpecificNotifications.length > 0 && (
                <div className="text-center text-sm text-gray-600 mb-2">
                  Page {currentPage} / {totalPages} (
                  {tableSpecificNotifications.length} notifications)
                </div>
              )}
              {tableSpecificNotifications.length > itemsPerPage && (
                <div className="flex justify-center items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${
                      currentPage === 1
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    First
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${
                      currentPage === 1
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    «
                  </button>
                  {getPaginationButtons()}
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${
                      currentPage === totalPages
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    »
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${
                      currentPage === totalPages
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    Last
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setIsNotificationModalOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDishModal = () => {
    if (!isDishModalOpen || !selectedTable) return null;

    const orders = selectedTable.orders || [];

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
          onClick={() => setIsDishModalOpen(false)}
        ></div>
        <div className="bg-white rounded-lg shadow-lg p-6 w-1/2 max-h-[80vh] overflow-y-auto relative z-50">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-xl font-bold">
              Table {selectedTable.id || "Unknown"} - Unpaid Orders
            </h2>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsDishModalOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            {orderLoading && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading orders...</span>
              </div>
            )}
            {orderError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                {orderError}
              </div>
            )}
            {!orderLoading && !orderError && (
              <>
                {orders.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No unpaid orders for this table
                  </div>
                ) : (
                  <div>
                    {orders.map((order) => (
                      <div key={order.orderId} className="mb-6">
                        <h3 className="font-semibold text-lg mb-2">
                          Order #{order.orderId}
                        </h3>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="text-left py-2 px-4">Dish Name</th>
                              <th className="text-left py-2 px-4">Quantity</th>
                              <th className="text-left py-2 px-4">Price</th>
                              <th className="text-left py-2 px-4">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, index) => (
                                <tr
                                  key={`${order.orderId}-item-${index}`}
                                  className="border-b hover:bg-gray-50"
                                >
                                  <td className="py-2 px-4">
                                    {item.dishName || "—"}
                                  </td>
                                  <td className="py-2 px-4">
                                    {item.quantity || "—"}
                                  </td>
                                  <td className="py-2 px-4">
                                    {item.price
                                      ? `${parseFloat(
                                          item.price
                                        ).toLocaleString("vi-VN")} VND`
                                      : "—"}
                                  </td>
                                  <td className="py-2 px-4">
                                    {item.notes || "—"}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="py-2 px-4 text-center text-gray-500"
                                >
                                  No items in this order
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        <p className="mt-2 text-right font-semibold">
                          Order Total:{" "}
                          {order.totalAmount
                            ? parseFloat(order.totalAmount).toLocaleString(
                                "vi-VN"
                              ) + " VND"
                            : "0 VND"}
                        </p>
                      </div>
                    ))}
                    <p className="text-right font-bold text-lg mt-4">
                      Table Total: {totalAmount.toLocaleString("vi-VN")} VND
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          {!orderLoading && !orderError && orders.length > 0 && (
            <div className="mt-4 flex justify-end space-x-4">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
                onClick={() => setIsDishModalOpen(false)}
              >
                Close
              </button>
              <button
                className="!bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
                onClick={handleShowPaymentModal}
              >
                Process Payment
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPaymentModal = () => {
    if (!isPaymentModalOpen || !selectedTable) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
          onClick={() => setIsPaymentModalOpen(false)}
        ></div>
        <div className="bg-white rounded-lg shadow-xl p-6 w-2/3 relative z-50">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">
              450 Le Van Viet Street, Tang Nhon Phu A Ward, District 9
            </p>
            <p className="text-sm text-gray-600">Phone: 0987654321</p>
            <h3 className="font-bold mt-2 text-xl text-blue-800">
              Payment Slip 001
            </h3>
          </div>
          <div className="flex justify-between border-b pb-2 mb-4">
            <span className="font-bold text-gray-700">
              Table {selectedTable.id}
            </span>
            <span className="font-bold text-gray-700">Payment Slip 001</span>
          </div>
          <div className="max-h-96 overflow-y-auto mb-4">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-700">
                    Dish name
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Qty
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Unit price
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Total amount
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedTable.orders.flatMap((order) =>
                  order.items.map((item, index) => (
                    <tr
                      key={`${order.orderId}-item-${index}`}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 text-gray-800">
                        {item.dishName || "—"}
                      </td>
                      <td className="py-3">{item.quantity || "—"}</td>
                      <td className="py-3">
                        {item.price
                          ? parseFloat(item.price).toLocaleString("vi-VN")
                          : "—"}{" "}
                        VND
                      </td>
                      <td className="py-3 font-medium">
                        {item.price && item.quantity
                          ? (item.price * item.quantity).toLocaleString("vi-VN")
                          : "—"}{" "}
                        VND
                      </td>
                      <td className="py-3 text-gray-500">
                        {item.notes || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-4 border-t pt-4">
            <span className="font-bold text-gray-700">Staff: 1</span>
            <span className="font-bold text-lg text-blue-800">
              Total Amount: {totalAmount.toLocaleString("vi-VN")} VND
            </span>
          </div>
          <div className="mt-6 flex justify-center space-x-4">
            <button
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="!bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg"
              onClick={handlePaymentSuccess}
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSuccessModal = () => {
    if (!isSuccessModalOpen) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
          onClick={() => setIsSuccessModalOpen(false)}
        ></div>
        <div className="bg-white rounded-lg p-6 w-80 relative z-50 text-center">
          <div className="flex justify-center mb-4">
            <img
              alt="Logo"
              className="w-24 h-24"
              src="../../src/assets/img/logoremovebg.png"
            />
          </div>
          <p className="text-lg mb-6 text-green-600 font-medium">
            Payment Successful
          </p>
          <button
            className="!bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
            onClick={() => setIsSuccessModalOpen(false)}
          >
            OK
          </button>
        </div>
      </div>
    );
  };

  const renderEmptyTableModal = () => {
    if (!isEmptyTableModalOpen) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
          onClick={() => setIsEmptyTableModalOpen(false)}
        ></div>
        <div className="bg-white rounded-lg shadow-lg p-6 w-96 relative z-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Empty Table List</h2>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsEmptyTableModalOpen(false)}
            >
              ✕
            </button>
          </div>
          <div>
            <table className="w-full">
              <thead>
                <tr className="bg-teal-100">
                  <th className="p-2 text-left">Table</th>
                  <th className="p-2 text-left">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {emptyTables.map((table) => (
                  <tr key={table.id} className="border-b">
                    <td className="p-2">{table.id}</td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        {table.capacity}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderBillModal = () => {
    if (!isBillModalOpen || !selectedTable) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
          onClick={() => setIsBillModalOpen(false)}
        ></div>
        <div className="bg-white rounded-lg shadow-xl p-6 w-2/3 relative z-50">
          <div className="text-center mb-4">
            <h3 className="font-bold text-xl text-blue-800">Bill Details</h3>
          </div>
          <div className="max-h-96 overflow-y-auto mb-4">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-700">
                    Dish name
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Qty
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedTable.orders.flatMap((order) =>
                  order.items.map((item, index) => (
                    <tr
                      key={`${order.orderId}-item-${index}`}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 text-gray-800">
                        {item.dishName || "—"}
                      </td>
                      <td className="py-3">{item.quantity || "—"}</td>
                      <td className="py-3">
                        {item.price
                          ? parseFloat(item.price).toLocaleString("vi-VN")
                          : "—"}{" "}
                        VND
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4 border-t pt-4">
            <span className="font-bold text-lg text-blue-800">
              Total: {totalAmount.toLocaleString("vi-VN")} VND
            </span>
          </div>
          <div className="mt-6 flex justify-center space-x-4">
            <button
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg"
              onClick={() => setIsBillModalOpen(false)}
            >
              Close
            </button>
            <button
              className="!bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
              onClick={handlePrintReceipt}
            >
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmModal = () => {
    if (!isConfirmModalOpen) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
          onClick={() => setIsConfirmModalOpen(false)}
        ></div>
        <div className="bg-white rounded-lg p-6 w-80 relative z-50 text-center">
          <div className="flex justify-center mb-4">
            <img
              alt="Logo"
              className="w-24 h-24"
              src="../../src/assets/img/logoremovebg.png"
            />
          </div>
          <p className="text-lg mb-6">ARE YOU SURE?</p>
          <div className="flex justify-center space-x-4">
            <button
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              NO
            </button>
            <button
              className="!bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
              onClick={() => {
                setIsConfirmModalOpen(false);
                setIsSuccessModalOpen(true);
              }}
            >
              YES
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-[#C2C7CA] flex justify-center items-center">
      <div
        className={`h-full w-full ${
          isDishModalOpen ||
          isPaymentModalOpen ||
          isEmptyTableModalOpen ||
          isBillModalOpen ||
          isConfirmModalOpen ||
          isSuccessModalOpen ||
          isNotificationModalOpen
            ? "blur-sm"
            : ""
        }`}
        onClick={() => setIsNotificationModalOpen(false)}
      >
        <MenuBar
          title="Table Management"
          icon="https://img.icons8.com/ios-filled/50/FFFFFF/table.png"
        />

        <div
          style={{ marginTop: "30px" }}
          className="flex-1 flex justify-center items-center"
        >
          <div className="w-[90%] h-[95%] bg-[#F0F8FD] rounded-lg shadow-lg overflow-hidden">
            <div className="flex-1 p-6 bg-gray-100 flex">
              <div className="flex-1 grid grid-cols-2 gap-4">
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer"
                    onClick={() => handleSelectTable(table)}
                  >
                    <div
                      style={{ backgroundColor: "#1C2E4A" }}
                      className="text-white p-3 flex justify-between items-center"
                    >
                      <h2 className="font-bold">Table {table.id}</h2>
                      <div className="flex items-center gap-2">
                        <span>{table.capacity}</span>
                        <img
                          width="15"
                          height="15"
                          src="https://img.icons8.com/ios-glyphs/90/FFFFFF/guest-male.png"
                          alt="guest-male"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 bg-gray-200">
                      <div
                        style={{
                          backgroundColor: "#BDC4D4",
                          borderRight: "1px solid #fff",
                        }}
                        className="p-4 flex flex-col items-center justify-center"
                      >
                        <span className="text-lg">Time</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div
                        style={{ backgroundColor: "#BDC4D4" }}
                        className="p-4 flex items-center justify-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowDishModal(table);
                        }}
                      >
                        <span className="text-lg">
                          {table.orders && table.orders.length > 0
                            ? `Unpaid Orders: ${
                                table.orders.filter(
                                  (order) =>
                                    order.paymentStatus?.toUpperCase() ===
                                    "UNPAID"
                                ).length
                              }`
                            : "No unpaid orders"}
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-2 flex justify-between items-center">
                      <div className="flex items-center">
                        <div
                          className={`w-6 h-6 ${
                            table.status === "occupied"
                              ? "bg-gray-700"
                              : "bg-green-500"
                          } rounded-full mr-2`}
                        ></div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-500 mx-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div
                          className="relative cursor-pointer"
                          onClick={(e) => toggleNotificationModal(e, table)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                            />
                          </svg>
                          {notificationsLoading ? (
                            <span className="absolute -top-1 -right-1 bg-gray-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                              ...
                            </span>
                          ) : unreadNotificationsByTable[table.id] > 0 ? (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                              {unreadNotificationsByTable[table.id]}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center">
                        {table.status === "occupied" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-red-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-green-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ml-4 w-64 flex flex-col gap-4">
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p>: Available Table</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-red-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p>: Occupied Table</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full"></div>
                    <p>: Paid</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-700 rounded-full"></div>
                    <p>: Unpaid</p>
                  </div>
                </div>

                <div className="mt-2">
                  <button
                    style={{ backgroundColor: "#BDC4D4" }}
                    className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                    onClick={handleShowEmptyTableModal}
                  >
                    <b style={{ color: "#FFFFFF" }} className="text-lg">
                      Empty Table List
                    </b>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderNotificationModal()}
      {renderDishModal()}
      {renderPaymentModal()}
      {renderEmptyTableModal()}
      {renderBillModal()}
      {renderConfirmModal()}
      {renderSuccessModal()}
    </div>
  );
};

export default TableManagementStaff;