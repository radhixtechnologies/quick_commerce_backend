const db = require('../config/db');

class ReportService {
  /**
   * Convert an array of objects to CSV format string
   */
  toCSV(records) {
    if (!records || records.length === 0) return 'No data available';
    const headers = Object.keys(records[0]);
    const csvRows = [headers.join(',')];

    for (const row of records) {
      const values = headers.map((header) => {
        const val = row[header] === null || row[header] === undefined ? '' : row[header];
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\r\n');
  }

  async generateReport(type, { startDate, endDate } = {}) {
    let rows = [];

    switch (type.toLowerCase()) {
      case 'sales':
        rows = [
          { Date: '2026-11-19', GrossSales: 2486500, OrdersCount: 3562, CommissionEarned: 372975, DeliveryFeeCollected: 125650, AvgOrderValue: 698.0 },
          { Date: '2026-11-18', GrossSales: 2310200, OrdersCount: 3340, CommissionEarned: 346530, DeliveryFeeCollected: 119800, AvgOrderValue: 691.5 },
          { Date: '2026-11-17', GrossSales: 2198000, OrdersCount: 3180, CommissionEarned: 329700, DeliveryFeeCollected: 114200, AvgOrderValue: 691.1 }
        ];
        break;

      case 'orders':
        rows = db.isConnected()
          ? await db.query('SELECT order_code, subtotal, discount_amount, delivery_charge, total_amount, payment_method, order_status, created_at FROM orders ORDER BY id DESC LIMIT 100')
          : db.memoryStore.orders.map((o) => ({
              OrderCode: o.order_code,
              Customer: o.customer_name,
              Vendor: o.vendor_name,
              Amount: o.amount,
              Payment: o.payment_method,
              Status: o.order_status,
              Date: o.created_at
            }));
        break;

      case 'customers':
        rows = db.isConnected()
          ? await db.query("SELECT id, name, email, phone, status, created_at FROM users WHERE role = 'customer' ORDER BY id DESC")
          : db.memoryStore.users.filter((u) => u.role === 'customer');
        break;

      case 'vendors':
        rows = db.isConnected()
          ? await db.query('SELECT id, business_name, business_type, phone, email, rating, total_orders, approval_status, is_open FROM vendors ORDER BY id DESC')
          : db.memoryStore.vendors.map((v) => ({
              ID: v.id,
              BusinessName: v.business_name,
              Type: v.business_type,
              Phone: v.phone,
              TotalOrders: v.total_orders,
              Rating: v.rating,
              Revenue: v.total_revenue || 350000,
              Status: v.approval_status
            }));
        break;

      case 'delivery':
        rows = db.isConnected()
          ? await db.query('SELECT id, full_name, phone, vehicle_type, vehicle_number, total_deliveries, rating, wallet_balance, is_online FROM delivery_boys')
          : db.memoryStore.delivery_boys.map((r) => ({
              ID: r.id,
              Name: r.full_name,
              Vehicle: r.vehicle_type,
              Number: r.vehicle_number,
              TotalDeliveries: r.total_deliveries,
              Rating: r.rating,
              Earnings: r.wallet_balance,
              IsOnline: r.is_online ? 'Yes' : 'No'
            }));
        break;

      case 'commission':
        rows = [
          { OrderCode: '#ORD1256', Vendor: 'Spice Hub', OrderAmount: 498.0, CommissionRate: '15%', CommissionAmount: 68.0, NetVendorShare: 395.0, Date: '2026-11-19' },
          { OrderCode: '#ORD1255', Vendor: 'Fresh Mart', OrderAmount: 697.0, CommissionRate: '12%', CommissionAmount: 77.0, NetVendorShare: 590.0, Date: '2026-11-19' },
          { OrderCode: '#ORD1254', Vendor: 'Daily Needs', OrderAmount: 249.0, CommissionRate: '10%', CommissionAmount: 24.0, NetVendorShare: 205.0, Date: '2026-11-19' }
        ];
        break;

      case 'payment':
        rows = [
          { TxnID: 'TXN1256_UPI_9901', OrderCode: '#ORD1256', Method: 'UPI', Amount: 498.0, Status: 'paid', Date: '2026-11-19' },
          { TxnID: 'TXN1255_CRD_8842', OrderCode: '#ORD1255', Method: 'CARD', Amount: 697.0, Status: 'paid', Date: '2026-11-19' },
          { TxnID: 'TXN1254_COD_7713', OrderCode: '#ORD1254', Method: 'COD', Amount: 249.0, Status: 'paid', Date: '2026-11-19' }
        ];
        break;

      case 'refund':
        rows = [
          { RefundID: 'REF-8012', OrderCode: '#ORD1248', Amount: 320.0, Reason: 'Item out of stock', Status: 'completed', Date: '2026-11-18' },
          { RefundID: 'REF-8013', OrderCode: '#ORD1239', Amount: 450.0, Reason: 'Late cancellation', Status: 'completed', Date: '2026-11-17' }
        ];
        break;

      case 'cancellation':
        rows = [
          { OrderCode: '#ORD1253', Customer: 'Pooja Singh', Vendor: 'Green Store', Amount: 399.0, Reason: 'Wrong delivery address selected', CancelledBy: 'customer', Date: '2026-11-19' }
        ];
        break;

      case 'cod':
        rows = [
          { OrderCode: '#ORD1254', Rider: 'Rahul Khan', AmountCollected: 249.0, DepositStatus: 'deposited', Date: '2026-11-19' },
          { OrderCode: '#ORD1251', Rider: 'Amit Sharma', AmountCollected: 450.0, DepositStatus: 'verified', Date: '2026-11-19' }
        ];
        break;

      case 'settlement':
        rows = [
          { SettlementID: 'SET-901', PayeeType: 'Vendor', Name: 'Spice Hub', Amount: 45200.0, AccountNo: 'XXXX1234', Status: 'processed', Date: '2026-11-18' },
          { SettlementID: 'SET-902', PayeeType: 'Delivery Boy', Name: 'Rahul Khan', Amount: 3200.0, AccountNo: 'XXXX5678', Status: 'processed', Date: '2026-11-18' }
        ];
        break;

      default:
        rows = [{ message: `Report type ${type} generated successfully.` }];
    }

    return {
      type,
      generatedAt: new Date().toISOString(),
      rowCount: rows.length,
      data: rows,
      csv: this.toCSV(rows)
    };
  }
}

module.exports = new ReportService();
