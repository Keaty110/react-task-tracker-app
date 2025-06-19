import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';

// --- Part 1: Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCfK90amkv7J1CV1RX1bx-315LQjxtbESo",
    authDomain: "task-tracker-app-c0dbf.firebaseapp.com",
    projectId: "task-tracker-app-c0dbf",
    storageBucket: "task-tracker-app-c0dbf.appspot.com",
    messagingSenderId: "737671080982",
    appId: "1:737671080982:web:55d969960f3e7f085e1937",
    measurementId: "G-4SV0MHE8DX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// --- Part 2: Main App Component ---
export default function App() {
    const [tasks, setTasks] = useState([]);
    const [goals, setGoals] = useState({});
    const [view, setView] = useState('dashboard');
    const [agentName, setAgentName] = useState('All Agents');
    const [selectedTask, setSelectedTask] = useState(null);

    useEffect(() => {
        const unsubscribeTasks = onSnapshot(collection(db, "tasks"), snapshot => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribeTasks();
    }, []);

    useEffect(() => {
        if (agentName === 'All Agents') {
            setGoals({});
            return;
        }
        const goalsDocRef = doc(db, 'goals', agentName);
        const unsubscribeGoals = onSnapshot(goalsDocRef, docSnap => {
            setGoals(docSnap.exists() ? docSnap.data() : {});
        });
        return () => unsubscribeGoals();
    }, [agentName]);

    const handleViewChange = (newView, taskId = null) => {
        if (newView === 'detail' && taskId) {
            setSelectedTask(tasks.find(t => t.id === taskId));
        } else {
            setSelectedTask(null);
        }
        setView(newView);
    };

    const renderView = () => {
        const filteredTasks = agentName === 'All Agents' ? tasks : tasks.filter(t => t.agentName === agentName);
        switch (view) {
            case 'form': return <TaskInputForm changeView={handleViewChange} db={db} />;
            case 'goals': return <SetGoalsForm changeView={handleViewChange} db={db} currentGoals={goals} agentName={agentName} />;
            case 'detail': return <TaskDetail task={selectedTask} changeView={handleViewChange} />;
            default: return <Dashboard tasks={filteredTasks} goals={goals} setAgentName={setAgentName} agentName={agentName} allTasks={tasks} />;
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">Task Tracker</h1>
                    <nav>
                        <button onClick={() => handleViewChange('dashboard')} className="text-gray-600 hover:text-blue-500 mx-2">Dashboard</button>
                        <button onClick={() => handleViewChange('goals')} className="text-gray-600 hover:text-blue-500 mx-2">Set Goals</button>
                        <button onClick={() => handleViewChange('form')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full">Add New Task</button>
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4">
                {renderView()}
            </main>
        </div>
    );
}

// --- Part 3: Child Components ---

// --- NEW Simplified Dashboard Component ---
const Dashboard = ({ tasks, goals, setAgentName, agentName, allTasks }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const availableYears = [...new Set(allTasks.map(task => new Date(task.date).getFullYear()))].sort((a, b) => b - a);
    const uniqueAgents = ['All Agents', ...new Set(allTasks.map(task => task.agentName).filter(Boolean))];

    const yearTasks = tasks.filter(task => new Date(task.date).getFullYear() === year);

    // Calculate YTD actuals
    const ytdData = {
        calls: yearTasks.reduce((acc, t) => acc + Number(t.calls || 0), 0),
        spokeTo: yearTasks.reduce((acc, t) => acc + Number(t.spokeTo || 0), 0),
        apptsSet: yearTasks.reduce((acc, t) => acc + Number(t.listingApptsSet || 0) + Number(t.buyerApptsSet || 0), 0),
        hours: yearTasks.reduce((acc, t) => acc + Number(t.hours || 0), 0),
    };
    
    // Prorate annual goals to YTD goals
    const monthsPassed = new Date().getFullYear() === year ? new Date().getMonth() + 1 : 12;
    const ytdGoals = {
        calls: Math.round((goals.calls || 0) * (monthsPassed / 12)),
        spokeTo: Math.round((goals.spokeTo || 0) * (monthsPassed / 12)),
        apptsSet: Math.round((goals.apptsSet || 0) * (monthsPassed / 12)),
        hours: Math.round((goals.hours || 0) * (monthsPassed / 12)),
    };

    // Reusable Metric Card Component
    const MetricCard = ({ title, value, goal }) => {
        const difference = value - goal;
        const differenceDisplay = `${difference >= 0 ? '+' : ''}${difference.toLocaleString()}`;
        return (
            <div className="bg-sky-100 text-gray-800 p-6 rounded-xl shadow-lg text-center flex flex-col h-full border-4 border-blue-500">
                {/* Line 1: Title - Now bold */}
                <p className="font-bold text-lg text-gray-700">{title}</p>
                
                {/* Line 2: Main Value - grows to take up space */}
                <div className="my-auto py-2 flex-grow flex items-center justify-center">
                    <p className="text-6xl font-bold text-gray-900">{value.toLocaleString()}</p>
                </div>
                
                {/* Line 3: Goal Comparison */}
                <p className="text-sm text-gray-500">
                    YTD Goal: {goal.toLocaleString()} ({differenceDisplay})
                </p>
            </div>
        );
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-lg">
                 <select value={agentName} onChange={e => setAgentName(e.target.value)} className="p-2 rounded-lg border-gray-300 border shadow-sm w-full md:w-auto">
                    {uniqueAgents.map(agent => <option key={agent} value={agent}>{agent}</option>)}
                </select>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="p-2 rounded-lg border-gray-300 border shadow-sm">
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            
            {/* This grid creates the row of boxes. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Spoke To" value={ytdData.spokeTo} goal={ytdGoals.spokeTo} />
                <MetricCard title="Calls" value={ytdData.calls} goal={ytdGoals.calls} />
                <MetricCard title="Appts Set" value={ytdData.apptsSet} goal={ytdGoals.apptsSet} />
                <MetricCard title="Hours" value={ytdData.hours} goal={ytdGoals.hours} />
            </div>
        </div>
    );
};

// --- UPDATED SetGoalsForm Component ---
const SetGoalsForm = ({ changeView, db, currentGoals, agentName }) => {
    const defaultState = { calls: '', spokeTo: '', apptsSet: '', hours: '' };
    const [goals, setGoals] = useState(defaultState);

    useEffect(() => {
        setGoals(currentGoals && Object.keys(currentGoals).length ? currentGoals : defaultState);
    }, [currentGoals]);

    const handleChange = e => setGoals(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (agentName === 'All Agents') {
            alert("Please select a specific agent from the dashboard to set goals.");
            return;
        }
        try {
            await setDoc(doc(db, 'goals', agentName), goals, { merge: true });
            alert(`Annual goals for ${agentName} updated successfully!`);
            changeView('dashboard');
        } catch (error) {
            console.error("Error updating goals: ", error);
        }
    };

    return (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-2 text-center">Set Annual Goals</h2>
            <p className="text-center text-lg font-semibold mb-6">{agentName}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block font-medium">Calls</label><input type="number" name="calls" value={goals.calls || ''} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div>
                    <div><label className="block font-medium">Spoke To</label><input type="number" name="spokeTo" value={goals.spokeTo || ''} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div>
                    <div><label className="block font-medium">Appts Set</label><input type="number" name="apptsSet" value={goals.apptsSet || ''} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div>
                    <div><label className="block font-medium">Hours</label><input type="number" name="hours" value={goals.hours || ''} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={() => changeView('dashboard')} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Save Goals</button>
                </div>
            </form>
        </div>
    );
};

// --- TaskInputForm Component (No major changes needed) ---
const TaskInputForm = ({ changeView, db }) => {
    const initialFormData = { date: new Date().toISOString().slice(0, 10), agentName: '', hours: '', calls: '', spokeTo: '', listingApptsSet: '', listingApptsHeld: '', listingContractsSigned: '', buyerApptsSet: '', buyerApptsHeld: '', buyerContractsSigned: '', closings: '', taskType: 'Prospecting' };
    const [formData, setFormData] = useState(initialFormData);
    const handleChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = async (e) => { e.preventDefault(); if (!formData.agentName) { alert("Please fill out Agent Name."); return; } try { await addDoc(collection(db, "tasks"), { ...formData, timestamp: serverTimestamp() }); setFormData(initialFormData); changeView('dashboard'); } catch (error) { console.error("Error adding task: ", error); } };
    return ( <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg"> <h2 className="text-2xl font-bold mb-6 text-center">Add a New Task</h2> <form onSubmit={handleSubmit} className="space-y-6"> <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> <div><label>Date</label><input name="date" type="date" value={formData.date} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div> <div><label>Agent Name</label><input name="agentName" type="text" placeholder="Enter name" value={formData.agentName} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div> <div><label>Task Type</label><select name="taskType" value={formData.taskType} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"><option>Prospecting</option><option>Follow Up</option></select></div> </div> <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> <div><label>Calls</label><input name="calls" type="number" value={formData.calls} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div> <div><label>Spoke To</label><input name="spokeTo" type="number" value={formData.spokeTo} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div><div><label>Hours</label><input name="hours" type="number" value={formData.hours} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div> </div> <div><h3 className="text-lg font-semibold mt-4">Listing Appointments</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div><label>Set</label><input name="listingApptsSet" type="number" value={formData.listingApptsSet} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div> <div><label>Held</label><input name="listingApptsHeld" type="number" value={formData.listingApptsHeld} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div> <div><label>Signed</label><input name="listingContractsSigned" type="number" value={formData.listingContractsSigned} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div></div></div><div><h3 className="text-lg font-semibold mt-4">Buyer Appointments</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div><label>Set</label><input name="buyerApptsSet" type="number" value={formData.buyerApptsSet} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div><div><label>Held</label><input name="buyerApptsHeld" type="number" value={formData.buyerApptsHeld} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div><div><label>Signed</label><input name="buyerContractsSigned" type="number" value={formData.buyerContractsSigned} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div></div></div><div><h3 className="text-lg font-semibold mt-4">Closings</h3><input name="closings" type="number" value={formData.closings} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm"/></div><div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={() => changeView('dashboard')} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Submit Task</button></div></form></div> );
};

const TaskDetail = ({ task, changeView }) => {
    if (!task) return <div><button onClick={() => changeView('dashboard')}>&larr; Back</button><p>Task not found.</p></div>;
    return ( <div className="bg-white p-8 rounded-lg shadow-lg"> <button onClick={() => changeView('dashboard')} className="bg-gray-200 text-gray-700 py-1 px-3 rounded-full mb-4">&larr; Back</button> <h2 className="text-3xl font-bold mb-2">{task.agentName} - {task.date}</h2> <p className="text-lg text-gray-600 mb-6">{task.taskType}</p> <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"> <div className="bg-gray-50 p-4 rounded-md"><p>Hours</p><p className="text-2xl font-semibold">{task.hours || 0}</p></div><div className="bg-gray-50 p-4 rounded-md"><p>Calls</p><p className="text-2xl font-semibold">{task.calls || 0}</p></div><div className="bg-gray-50 p-4 rounded-md"><p>Spoke To</p><p className="text-2xl font-semibold">{task.spokeTo || 0}</p></div><div className="col-span-full mt-4 border-t pt-4"><h3 className="text-xl font-semibold">Listing Details</h3></div><div className="bg-gray-50 p-4 rounded-md"><p>Appts Set</p><p className="text-2xl">{task.listingApptsSet || 0}</p></div><div className="bg-gray-50 p-4 rounded-md"><p>Appts Held</p><p className="text-2xl">{task.listingApptsHeld || 0}</p></div><div className="bg-gray-50 p-4 rounded-md"><p>Contracts Signed</p><p className="text-2xl">{task.listingContractsSigned || 0}</p></div><div className="col-span-full mt-4 border-t pt-4"><h3 className="text-xl font-semibold">Buyer Details</h3></div><div className="bg-gray-50 p-4 rounded-md"><p>Appts Set</p><p className="text-2xl">{task.buyerApptsSet || 0}</p></div><div className="bg-gray-50 p-4 rounded-md"><p>Appts Held</p><p className="text-2xl">{task.buyerApptsHeld || 0}</p></div><div className="bg-gray-50 p-4 rounded-md"><p>Contracts Signed</p><p className="text-2xl">{task.buyerContractsSigned || 0}</p></div><div className="col-span-full mt-4 border-t pt-4"><h3 className="text-xl font-semibold">Closings</h3></div><div className="bg-gray-50 p-4 rounded-md"><p>Total Closings</p><p className="text-2xl font-semibold">{task.closings || 0}</p></div></div></div> );
};
