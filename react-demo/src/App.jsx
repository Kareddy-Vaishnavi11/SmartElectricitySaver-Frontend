import { useState } from 'react';
import './App.css';

function App() {
  const [units, setUnits] = useState(180);
  const rate = 7;
  const bill = units * rate;

  const appliances = [
    { name: 'Air Conditioner', usage: 'High consumption' },
    { name: 'Refrigerator', usage: 'Regular consumption' },
    { name: 'LED Lights', usage: 'Low consumption' },
  ];

  return (
    <div className="dashboard">
      <header>
        <h1>Smart Electricity Saver</h1>
        <p>Monitor your electricity usage and save energy.</p>
      </header>

      <section className="summary">
        <div className="card">
          <h3>Monthly Consumption</h3>
          <h2>{units} kWh</h2>
        </div>

        <div className="card">
          <h3>Estimated Bill</h3>
          <h2>₹{bill.toLocaleString('en-IN')}</h2>
        </div>

        <div className="card">
          <h3>Energy Status</h3>
          <h2>{units > 200 ? 'High' : 'Normal'}</h2>
        </div>
      </section>

      <section className="usage">
        <h2>Update Electricity Consumption</h2>
        <label htmlFor="units">Monthly units consumed:</label>
        <input
          id="units"
          type="number"
          min="0"
          value={units}
          onChange={(event) =>
            setUnits(Math.max(0, Number(event.target.value)))
          }
        />
        <p>Your estimated bill is calculated at ₹7 per unit.</p>
      </section>

      <section className="usage">
        <h2>Appliance Overview</h2>
        {appliances.map((appliance) => (
          <div className="appliance" key={appliance.name}>
            <strong>{appliance.name}</strong>
            <span>{appliance.usage}</span>
          </div>
        ))}
      </section>

      <section className="usage">
        <h2>Energy-Saving Recommendations</h2>
        <ul>
          <li>Switch off lights when not required.</li>
          <li>Use energy-efficient appliances.</li>
          <li>Avoid leaving devices on standby.</li>
        </ul>
      </section>
    </div>
  );
}

export default App;