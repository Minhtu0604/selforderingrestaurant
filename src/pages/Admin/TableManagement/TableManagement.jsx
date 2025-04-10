import React, { useState } from "react";
import MenuBar from "../../../components/layout/MenuBar.jsx";

const TableManagement = () => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEmptyTableModalOpen, setIsEmptyTableModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableCapacity, setNewTableCapacity] = useState("");
  const [newTableNumber, setNewTableNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // Lưu thông báo lỗi
  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  // Thêm state mới cho bảng đang chỉnh sửa
  const [editingTables, setEditingTables] = useState([]);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Notification data
  const [notifications] = useState([
    {
      id: 1,
      type: "Call staff",
      time: "18:30:00",
      date: "10/10/2024",
      table: "01",
    },
    {
      id: 2,
      type: "Request",
      time: "16:00:00",
      date: "10/10/2024",
      table: "01",
    },
    {
      id: 3,
      type: "Payment request",
      time: "16:30:00",
      date: "10/10/2024",
      table: "02",
    },
    {
      id: 4,
      type: "Request",
      time: "16:00:00",
      date: "10/10/2024",
      table: "03",
    },
    {
      id: 5,
      type: "Request",
      time: "16:00:00",
      date: "10/10/2024",
      table: "04",
    },
    {
      id: 6,
      type: "Request",
      time: "16:00:00",
      date: "10/10/2024",
      table: "05",
    },
    // Add more notifications as needed
  ]);

  const toggleNotificationModal = (e, table) => {
    e.stopPropagation();
    setSelectedTable(table);
    setIsNotificationModalOpen(!isNotificationModalOpen);
  };

  const handleSelectTable = (table) => {
    setSelectedTable(table);
  };

  const handleShowDishModal = (table) => {
    setSelectedTable(table);
    setIsDishModalOpen(true);
  };

  const handleShowPaymentModal = () => {
    setIsDishModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  // const handlePaymentSuccess = () => {
  //   setIsPaymentModalOpen(false);
  //   setIsSuccessModalOpen(true);
  // };

  const handleShowEmptyTableModal = () => {
    setIsEmptyTableModalOpen(true);
  };

  const handlePrintReceipt = () => {
    setIsBillModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleAddTableModal = () => {
    setIsAddTableModalOpen(true);
  };

  const handleCloseAddTableModal = () => {
    setIsAddTableModalOpen(false);
  };

  const handleAddTableSuccess = (newTable) => {
    // Kiểm tra nếu ID đã tồn tại
    const isDuplicateId = tables.some((table) => table.id === newTable.id);
    if (isDuplicateId) {
      setErrorMessage("Table ID already exists. Please enter a unique ID.");
      return; // Dừng thêm bàn
    }

    // Thêm bàn mới nếu ID không trùng
    setTables((prevTables) => [
      ...prevTables,
      {
        id: newTable.id, // Số bàn được nhập từ input
        status: "available", // Trạng thái mặc định
        dishes: [], // Không có món ăn ban đầu
        capacity: newTable.capacity, // Sức chứa được nhập từ input
      },
    ]);
    setIsAddTableModalOpen(false); // Đóng modal
    setNewTableNumber(""); // Reset số bàn
    setNewTableCapacity(""); // Reset sức chứa
    setErrorMessage(""); // Xóa thông báo lỗi
  };

  const handleEditTableModal = () => {
    setEditingTables(JSON.parse(JSON.stringify(tables)));
    setIsEditTableModalOpen(true);
  };

  const handleCloseEditTableModal = () => {
    setIsEditTableModalOpen(false);
  };

  // Sửa đổi hàm này để chỉ cập nhật editingTables
  const handleEditTableField = (index, field, value) => {
    setEditingTables((prevTables) =>
      prevTables.map((table, i) =>
        i === index ? { ...table, [field]: value } : table
      )
    );
  };

  // Sửa đổi hàm này để chỉ xóa từ editingTables
  const handleDeleteTable = (id) => {
    setEditingTables((prevTables) =>
      prevTables.filter((table) => table.id !== id)
    );
  };

  // Sửa đổi hàm lưu thay đổi
  const handleSaveTableChanges = () => {
    // Kiểm tra nếu có số bàn trùng lặp
    const isDuplicateId = editingTables.some(
      (table, index, self) => self.findIndex((t) => t.id === table.id) !== index
    );

    if (isDuplicateId) {
      setErrorMessage(
        "Duplicate table numbers found. Please ensure all table numbers are unique."
      );
      return;
    }

    // Kiểm tra giá trị không hợp lệ
    const hasInvalidValues = editingTables.some(
      (table) => table.id <= 0 || table.capacity <= 0
    );

    if (hasInvalidValues) {
      setErrorMessage("Table number and capacity must be greater than 0.");
      return;
    }

    // Nếu không có lỗi, cập nhật tables từ editingTables
    setTables([...editingTables]);

    // Đóng modal và xóa thông báo lỗi
    setIsEditTableModalOpen(false);
    setErrorMessage("");
  };

  // Thêm hàm hủy thay đổi
  const handleCancelTableChanges = () => {
    setIsEditTableModalOpen(false);
    setErrorMessage("");
  };
  const totalAmount =
    selectedTable?.dishes?.reduce(
      (sum, dish) => sum + dish.price * dish.quantity,
      0
    ) || 0;

  const [tables, setTables] = useState([
    {
      id: 1,
      status: "occupied",
      dishes: [
        {
          name: "Huitres Fraiches (6PCS)",
          quantity: 1,
          price: 200000,
          status: "Complete",
          image: "../../../../assets/img/Mon1.jpg",
        },
        {
          name: "Huitres Gratinees (6PCS)",
          quantity: 1,
          price: 250000,
          status: "Complete",
          image: "../../../assets/img/Mon1.jpg",
        },
        {
          name: "Tartare De Saumon",
          quantity: 1,
          price: 180000,
          status: "Complete",
          image: "../../../assets/img/Mon1.jpg",
        },
        {
          name: "Salad Gourmande",
          quantity: 1,
          price: 120000,
          status: "Complete",
          image: "../../../assets/img/Mon1.jpg",
        },
        {
          name: "Salad Landaise",
          quantity: 1,
          price: 150000,
          status: "Pending",
          image: "../../../assets/img/",
        },
        {
          name: "Magret De Canard",
          quantity: 1,
          price: 300000,
          status: "Pending",
          image: "../../../assets/img/Mon1.jpg",
        },
      ],
      capacity: 8,
    },
    {
      id: 2,
      status: "available",
      dishes: [],
      capacity: 4,
    },
    {
      id: 3,
      status: "occupied",
      dishes: [
        {
          name: "Foie Gras",
          quantity: 2,
          price: 350000,
          status: "Complete",
          image: "../../../assets/img/Mon2.jpg",
        },
        {
          name: "Bouillabaisse",
          quantity: 1,
          price: 280000,
          status: "Complete",
          image: "../../../assets/img/Mon3.jpg",
        },
        {
          name: "Ratatouille",
          quantity: 1,
          price: 120000,
          status: "Pending",
          image: "../../../assets/img/Mon4.jpg",
        },
        {
          name: "Crème Brûlée",
          quantity: 2,
          price: 90000,
          status: "Pending",
          image: "../../../assets/img/Mon5.jpg",
        },
      ],
      capacity: 6,
    },
    {
      id: 4,
      status: "occupied",
      dishes: [
        {
          name: "Steak Frites",
          quantity: 3,
          price: 220000,
          status: "Complete",
          image: "../../../assets/img/Mon6.jpg",
        },
        {
          name: "Moules Marinières",
          quantity: 1,
          price: 180000,
          status: "Complete",
          image: "../../../assets/img/Mon7.jpg",
        },
        {
          name: "Tarte Tatin",
          quantity: 1,
          price: 110000,
          status: "Pending",
          image: "../../../assets/img/Mon8.jpg",
        },
        {
          name: "Escargots",
          quantity: 1,
          price: 150000,
          status: "Complete",
          image: "../../../assets/img/Mon9.jpg",
        },
        {
          name: "French Onion Soup",
          quantity: 2,
          price: 80000,
          status: "Complete",
          image: "../../../assets/img/Mon10.jpg",
        },
      ],
      capacity: 8,
    },
  ]);

  const emptyTables = tables.filter((table) => table.status === "available");

  // Add a function to handle notifications and update table status
  const handleNotification = (notification) => {
    // Convert table ID from notification (e.g., "01") to number (e.g., 1) for comparison
    const tableId = parseInt(notification.table, 10);

    // If it's a new notification, change table status to "occupied"
    setTables((prevTables) =>
      prevTables.map((table) => {
        if (table.id === tableId && table.status === "available") {
          return { ...table, status: "occupied" };
        }
        return table;
      })
    );
  };

  // Add this to handle payment completion and change table status to available
  const handlePaymentComplete = (tableId) => {
    setTables((prevTables) =>
      prevTables.map((table) => {
        if (table.id === tableId) {
          return { ...table, status: "available", dishes: [] };
        }
        return table;
      })
    );

    // Close any open modals
    setIsPaymentModalOpen(false);
    setIsBillModalOpen(false);
    setIsConfirmModalOpen(false);
    setIsSuccessModalOpen(true);
  };

  // Modify the existing handlePaymentSuccess function
  const handlePaymentSuccess = () => {
    if (selectedTable) {
      handlePaymentComplete(selectedTable.id);
    } else {
      setIsPaymentModalOpen(false);
      setIsSuccessModalOpen(true);
    }
  };

  // Add a useEffect to process any new notifications when the component mounts
  useEffect(() => {
    // Process initial notifications
    notifications.forEach(handleNotification);

    // You could add a listener here for new notifications if you have a real-time system
  }, []);

  // Example of how to handle a new notification arriving (you'd connect this to your notification system)
  const handleNewNotification = (newNotification) => {
    // Process the new notification
    handleNotification(newNotification);

    // You might want to add the notification to your notifications state
    // setNotifications(prev => [...prev, newNotification]);
  };

  // Modify the NotificationModal component to include a "Mark as Handled" button
  const NotificationModal = ({ isOpen, onClose, table, notifications }) => {
    if (!isOpen || !table) return null;

    const tableNotifications = notifications.filter(
      (n) => n.table === table.id.toString().padStart(2, "0")
    );

    const handleMarkAsHandled = (notificationId) => {
      // Remove the notification from the list
      // In a real app, you'd probably call an API here
      // For now, we'll just simulate this
      // This is where you might want to trigger other actions
      // For payment requests, you'd open the payment modal
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-96">
          <h2 className="text-xl font-bold mb-4">
            Notifications for Table {table.id}
          </h2>
          {tableNotifications.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {tableNotifications.map((notification) => (
                <div key={notification.id} className="border-b py-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{notification.type}</p>
                      <p className="text-sm text-gray-500">
                        {notification.date} - {notification.time}
                      </p>
                    </div>
                    {notification.type === "Payment request" ? (
                      <button
                        onClick={() => {
                          handleMarkAsHandled(notification.id);
                          onClose();
                          handleShowPaymentModal();
                        }}
                        className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                      >
                        Process
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkAsHandled(notification.id)}
                        className="bg-green-500 text-white px-2 py-1 rounded text-sm"
                      >
                        Handled
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No notifications for this table.</p>
          )}
          <button
            onClick={onClose}
            className="mt-4 bg-gray-500 text-white px-4 py-2 rounded w-full"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-[#C2C7CA] flex justify-center items-center">
      {/* Background blur when any modal is open */}
      <div
        className={`h-full w-full ${
          isDishModalOpen ||
          isPaymentModalOpen ||
          isEmptyTableModalOpen ||
          isBillModalOpen ||
          isConfirmModalOpen ||
          isSuccessModalOpen ||
          isNotificationModalOpen ||
          isAddTableModalOpen ||
          isEditTableModalOpen
            ? "blur-sm"
            : ""
        }`}
        onClick={() => setIsNotificationModalOpen(false)}
      >
        <MenuBar
          title="Table Management"
          icon="https://img.icons8.com/ios-filled/5050/FFFFFF/table.png"
        />
        {/* Container chính nằm giữa */}
        <div
          style={{ marginTop: "30px" }}
          className="flex-1 flex justify-center Items-center"
        >
          <div className="w-[90%] h-[95%] bg-[#F0F8FD] rounded-lg shadow-lg overflow-hidden">
            {/* Nội dung chính */}
            <div className="flex-1 p-6 bg-gray-100 flex">
              {/* Table Grid */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                {/* Nội dung bảng */}
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer"
                    onClick={() => handleSelectTable(table)}
                  >
                    {/* Table Header */}
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
                    {/* Table Details */}
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
                          {table.dishes.length > 0
                            ? `Dish ${
                                table.dishes.filter(
                                  (d) => d.status === "Complete"
                                ).length
                              }/${table.dishes.length}`
                            : "No dishes"}
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
                          {table.status === "occupied" &&
                            notifications.filter(
                              (n) =>
                                n.table === table.id.toString().padStart(2, "0")
                            ).length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                {
                                  notifications.filter(
                                    (n) =>
                                      n.table ===
                                      table.id.toString().padStart(2, "0")
                                  ).length
                                }
                              </span>
                            )}
                        </div>
                      </div>
                      <div className="px-4 py-2 flex justify-between items-center">
                        <div className="flex items-center">
                          {/* SVG icon */}
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
                  </div>
                ))}
              </div>

              {/* Right Side Information Cards */}
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
                {/* Add and Edit Buttons */}
                <div className="flex gap-6 mt-4">
                  {/* Add Table Button */}
                  <button
                    style={{ marginLeft: "50px", backgroundColor: "#FFFFFF" }}
                    className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg shadow-md"
                    onClick={handleAddTableModal}
                  >
                    <img
                      width="20"
                      height="20"
                      src="https://img.icons8.com/ios-glyphs/90/49B02D/plus-math.png"
                      alt="plus-math"
                    />
                  </button>

                  {/* Edit Table Button */}
                  <button
                    style={{ backgroundColor: "#FFFFFF" }}
                    className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg shadow-md"
                    onClick={handleEditTableModal} // Gọi hàm mở modal
                  >
                    <img
                      width="19px"
                      height="10px"
                      src="https://img.icons8.com/ios-glyphs/90/274FAA/edit--v1.png"
                      alt="edit--v1"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal "Add Table" */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0"
            onClick={handleCloseEditTableModal} // Đóng modal khi nhấn ra ngoài
          ></div>

          {/* Nội dung modal */}
          <div className="bg-[#F0F8FD] rounded-lg shadow-lg p-6 w-[400px] relative z-50">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={handleCloseAddTableModal} // Đóng modal
            >
              ✕
            </button>
            <h2
              style={{ fontSize: "24px" }}
              className="text-center text-xl font-bold mb-4"
            >
              Add Table
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault(); // Ngăn reload trang
                handleAddTableSuccess({
                  id: parseInt(newTableNumber), // Lấy số bàn từ input
                  capacity: parseInt(newTableCapacity), // Lấy sức chứa từ input
                });
              }}
            >
              {/* Input Table Number */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Table Number
                </label>
                <input
                  type="number"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)} // Cập nhật state
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Enter table number"
                  required
                />
              </div>

              {/* Input Capacity */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)} // Cập nhật state
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Enter table capacity"
                  required
                />
              </div>

              {/* Hiển thị thông báo lỗi */}
              {errorMessage && (
                <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
              )}

              <button
                style={{ backgroundColor: "black", marginTop: "10px" }}
                type="submit"
                className="w-full text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-800"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {isEditTableModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0 "
            onClick={handleCloseEditTableModal} // Đóng modal khi nhấn ra ngoài
          ></div>

          {/* Nội dung modal */}
          <div className="bg-[#F0F8FD] rounded-lg shadow-lg p-6 w-[600px] relative z-50">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={handleCloseEditTableModal} // Đóng modal
            >
              ✕
            </button>
            <h2 className="text-center text-xl font-bold mb-4">Edit Tables</h2>

            {/* Bảng chỉnh sửa */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-teal-100">
                  <th className="p-2 text-left">Table Number</th>
                  <th className="p-2 text-left">Capacity</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {editingTables.map((table, index) => (
                  <tr key={index} className="border-b">
                    {/* Số bàn */}
                    <td className="p-2">
                      <input
                        type="number"
                        value={table.id}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value, 10);
                          if (!isNaN(newValue) && newValue > 0) {
                            handleEditTableField(index, "id", newValue);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1"
                      />
                    </td>
                    {/* Sức chứa */}
                    <td className="p-2">
                      <input
                        type="number"
                        value={table.capacity}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value, 10);
                          if (!isNaN(newValue) && newValue > 0) {
                            handleEditTableField(index, "capacity", newValue);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1"
                      />
                    </td>
                    {/* Hành động */}
                    <td className="p-2 text-center">
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteTable(table.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Hiển thị thông báo lỗi */}
            {errorMessage && (
              <p className="text-red-500 text-sm mt-4">{errorMessage}</p>
            )}

            {/* Nút lưu */}
            <button
              style={{
                backgroundColor: "black",
                marginTop: "10px",
                display: "flex",
                justifyContent: "center",
              }}
              className=" hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={handleSaveTableChanges}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {isNotificationModalOpen && selectedTable && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0  bg-opacity-50"
            onClick={() => setIsNotificationModalOpen(false)}
          ></div>

          {/* Modal Content */}
          <div
            className="bg-[#F0F9FF] rounded-xl shadow-lg p-6 
            w-[500px] max-w-full max-h-[80vh] 
            overflow-y-auto z-50 relative"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Notifications
              </h2>
              <div className="text-sm text-gray-600">
                Table {selectedTable.id}
              </div>
              <button
                className="text-gray-500 hover:text-gray-700 text-xl"
                onClick={() => setIsNotificationModalOpen(false)}
              >
                &times;
              </button>
            </div>

            {/* Table */}
            <table className="w-full text-sm border-separate border-spacing-y-1">
              <thead className="bg-cyan-200 text-gray-800 rounded-md">
                <tr>
                  <th className="py-1 text-left pl-2">ON</th>
                  <th className="py-1 text-left">Request</th>
                  <th className="py-1 text-left pr-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {notifications
                  .filter(
                    (n) =>
                      n.table === selectedTable.id.toString().padStart(2, "0")
                  )
                  .map((notification) => (
                    <tr
                      key={notification.id}
                      className="bg-white shadow-sm rounded-md"
                    >
                      <td className="py-1 px-2">{notification.table}</td>
                      <td className="py-1">{notification.type}</td>
                      <td className="py-1 pr-2">
                        <div>{notification.time}</div>
                        <div>{notification.date}</div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dish Modal */}
      {isDishModalOpen && selectedTable && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-opacity-50"
            onClick={() => setIsDishModalOpen(false)}
          ></div>
          <div className="bg-white rounded-lg shadow-lg p-6 w-1/2 relative z-50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Table {selectedTable.id} - Dishes
              </h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setIsDishModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {selectedTable.dishes.map((dish, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <span>{dish.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 bg-gray-200 rounded">-</button>
                    <span>{dish.quantity}</span>
                    <button className="px-2 py-1 bg-gray-200 rounded">+</button>
                  </div>
                  <span
                    className={`px-3 py-1 rounded ${
                      dish.status === "Complete"
                        ? "bg-green-500 text-white"
                        : "bg-yellow-500 text-white"
                    }`}
                  >
                    {dish.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="!bg-blue-500 text-white px-4 py-2 rounded-lg"
                onClick={handleShowPaymentModal}
              >
                Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedTable && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-opacity-50"
            onClick={() => setIsPaymentModalOpen(false)}
          ></div>
          <div className="bg-white rounded-lg shadow-xl p-6 w-2/3 relative z-50">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                450 Le Van Viel Street, Tang Nhon Phu A Word, District 9
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
                  {selectedTable.dishes.map((dish, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 text-gray-800">{dish.name}</td>
                      <td className="py-3">{dish.quantity}</td>
                      <td className="py-3">
                        {dish.price ? dish.price.toLocaleString() : "-"}
                      </td>
                      <td className="py-3 font-medium">
                        {dish.price
                          ? (dish.price * dish.quantity).toLocaleString()
                          : "-"}
                      </td>
                      <td className="py-3 text-gray-500">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between mt-4 border-t pt-4">
              <span className="font-bold text-gray-700">Staff: 1</span>
              <span className="font-bold text-lg text-blue-800">
                Total Amount: {totalAmount.toLocaleString()} VND
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
      )}

      {/* Empty Table List Modal */}
      {isEmptyTableModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-opacity-50"
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
      )}

      {/* Bill Modal */}
      {isBillModalOpen && selectedTable && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-opacity-50"
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
                  {selectedTable.dishes.map((dish, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 text-gray-800">{dish.name}</td>
                      <td className="py-3">{dish.quantity}</td>
                      <td className="py-3">
                        {dish.price.toLocaleString()} VND
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4 border-t pt-4">
              <span className="font-bold text-lg text-blue-800">
                Total: {totalAmount.toLocaleString()} VND
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
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-opacity-50"
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
      )}

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        table={selectedTable}
        notifications={notifications}
      />

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-green-500 mx-auto mb-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
            <p className="mb-4">
              Table status has been changed to Available. The bill has been
              printed successfully.
            </p>
            <button
              onClick={() => setIsSuccessModalOpen(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableManagement;
