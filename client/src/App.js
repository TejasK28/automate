import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_URL = process.env.BASEURL;

// Helper to parse dates
function parseDate(dateStr) {
  return dateStr ? new Date(dateStr) : null;
}

// Helper to format as YYYY-MM
function getMonthKey(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Days between two dates
function daysBetween(start, end) {
  if (!start || !end) return null;
  const ms = parseDate(end) - parseDate(start);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function App() {
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    fetch('https://automate-red.vercel.app/api/invoices')
      .then(res => res.json())
      .then(data => {
        setInvoices(data);
        const uniqueCompanies = Array.from(new Set(data.map(inv => inv['Client Name'])));
        setCompanies(uniqueCompanies);
      })
      .catch(err => console.error('Failed to fetch invoices:', err));
  }, []);

  // Filter invoices by selected company
  const filteredInvoices = selectedCompany
    ? invoices.filter(inv => inv['Client Name'] === selectedCompany)
    : [];

  // Compute days to pay for each invoice
  const invoicesWithDays = filteredInvoices.map(inv => {
    const daysToPay = daysBetween(inv['Date Invoiced'], inv['Date Paid']);
    return { ...inv, daysToPay };
  });

  // Average days to pay
  const avgDaysToPay =
    invoicesWithDays.length > 0
      ? (
          invoicesWithDays
            .map(inv => inv.daysToPay)
            .filter(v => v !== null)
            .reduce((a, b) => a + b, 0) /
          invoicesWithDays.filter(inv => inv.daysToPay !== null).length
        ).toFixed(1)
      : null;

  // Monthly totals
  const monthlyTotals = {};
  invoicesWithDays.forEach(inv => {
    const month = getMonthKey(inv['Date Invoiced']);
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = { invoiceAmount: 0, paidAmount: 0 };
    }
    monthlyTotals[month].invoiceAmount += Number(inv['Invoice Amount'] || 0);
    monthlyTotals[month].paidAmount += Number(inv['Paid Amount'] || 0);
  });

  // Late invoices: define as >30 days to pay
  const lateInvoices = invoicesWithDays.filter(inv => inv.daysToPay > 30);

  // average days to pay per month
  const daysPerMonth = {};
  invoicesWithDays.forEach(inv => {
    const month = getMonthKey(inv['Date Invoiced']);
    if (!month || inv.daysToPay === null) return;
    if (!daysPerMonth[month]) {
      daysPerMonth[month] = { total: 0, count: 0 };
    }
    daysPerMonth[month].total += inv.daysToPay;
    daysPerMonth[month].count += 1;
  });
  const avgDaysPerMonth = Object.entries(daysPerMonth).map(([month, { total, count }]) => ({
    month,
    avgDays: count ? Number((total / count).toFixed(1)) : 0,
  }));

  return (
    <div style={{ padding: 20 }}>
      <h1>Select a Company</h1>
      <select
        value={selectedCompany}
        onChange={e => setSelectedCompany(e.target.value)}
      >
        <option value="">-- Select Company --</option>
        {companies.map(company => (
          <option key={company} value={company}>
            {company}
          </option>
        ))}
      </select>

      {selectedCompany && (
        <>
          <h2>Average Days to Pay Per Month</h2>
          <div style={{ width: '100%', maxWidth: 600, height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={avgDaysPerMonth}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'Avg Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgDays" fill="#8884d8" name="Avg Days to Pay" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2>Invoices for Company: {selectedCompany}</h2>
          <table border="1" cellPadding="5">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Invoice Date</th>
                <th>Invoice Amount</th>
                <th>Paid Amount</th>
                <th>Days to Pay</th>
                <th>Fully Paid?</th>
              </tr>
            </thead>
            <tbody>
              {invoicesWithDays.map((inv, idx) => (
                <tr key={idx}>
                  <td>{inv['Invoice Reference']}</td>
                  <td>{inv['Date Invoiced']}</td>
                  <td>{inv['Invoice Amount']}</td>
                  <td>{inv['Paid Amount']}</td>
                  <td>{inv.daysToPay !== null ? inv.daysToPay : 'N/A'}</td>
                  <td>
                    {Number(inv['Invoice Amount']) === Number(inv['Paid Amount'])
                      ? 'Yes'
                      : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Average Days to Pay: {avgDaysToPay ?? 'N/A'}</h3>

          <h3>Monthly Totals</h3>
          <table border="1" cellPadding="5">
            <thead>
              <tr>
                <th>Month</th>
                <th>Invoice Amount Total</th>
                <th>Paid Amount Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthlyTotals).map(([month, totals]) => (
                <tr key={month}>
                  <td>{month}</td>
                  <td>{totals.invoiceAmount.toFixed(2)}</td>
                  <td>{totals.paidAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Late Invoices (Paid after 30 days)</h3>
          <ul>
            {lateInvoices.length === 0 && <li>None</li>}
            {lateInvoices.map((inv, idx) => (
              <li key={idx}>
                Ref: {inv['Invoice Reference']} | Days to Pay: {inv.daysToPay}
              </li>
            ))}
          </ul>
          {}
        </>
      )}
    </div>
  );
}
