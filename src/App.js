import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';


// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// --- Main App Component ---
export default function App() {
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [view, setView] = useState('dashboard'); // 'dashboard', 'form', 'detail'
    const [agentName, setAgentName] = useState('All Agents');


    // --- Fetch tasks from Firestore ---
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTasks(tasksData);
        });
        return () => unsubscribe();
    }, []);


    // --- Handle view change ---
    const handleViewChange = (newView, taskId = null) => {
        if (newView === 'detail' && taskId) {
            const task = tasks.find(t => t.id === taskId);
            setSelectedTask(task);
        } else {
            setSelectedTask(null);
        }
        setView(newView);
    };


    // -- Filter tasks by agent --
    const filteredTasks = agentName === 'All Agents'
        ? tasks
        : tasks.filter(task => task.agentName === agentName);


    // --- Render the correct view ---
    const renderView = () => {
        switch (view) {
            case 'form':
                return <TaskInputForm changeView={handleViewChange} />;
            case 'detail':
                return <TaskDetail task={selectedTask} changeView={handleViewChange} />;
            default:
                return (
                    <Dashboard
                        tasks={filteredTasks}
                        changeView={handleViewChange}
                        setAgentName={setAgentName}
                        agentName={agentName}
                        allTasks={tasks}
                    />
                );
        }
    };


    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">Task Tracker</h1>
                    <nav>
                        <button
                            onClick={() => handleViewChange('dashboard')}
                            className="text-gray-600 hover:text-blue-500 mx-2"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => handleViewChange('form')}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300"
                        >
                            Add New Task
                        </button>
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4">
                {renderView()}
            </main>
        </div>
    );
}


// --- Dashboard Component ---
const Dashboard = ({ tasks, changeView, setAgentName, agentName, allTasks }) => {
    const [year, setYear] = useState(new Date().getFullYear());


    const uniqueAgents = ['All Agents', ...new Set(allTasks.map(task => task.agentName))];


    const monthlyData = Array(12).fill(0).map((_, monthIndex) => {
        const monthTasks = tasks.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate.getFullYear() === year && taskDate.getMonth() === monthIndex;
        });


        return {
            month: new Date(year, monthIndex).toLocaleString('default', { month: 'short' }),
            hours: monthTasks.reduce((acc, t) => acc + Number(t.hours || 0), 0),
            calls: monthTasks.reduce((acc, t) => acc + Number(t.calls || 0), 0),
            spokeTo: monthTasks.reduce((acc, t) => acc + Number(t.spokeTo || 0), 0),
            listingApptsSet: monthTasks.reduce((acc, t) => acc + Number(t.listingApptsSet || 0), 0),
            buyerApptsSet: monthTasks.reduce((acc, t) => acc + Number(t.buyerApptsSet || 0), 0),
        };
    });


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <select value={agentName} onChange={e => setAgentName(e.target.value)} className="p-2 rounded-md border">
                        {uniqueAgents.map(agent => <option key={agent} value={agent}>{agent}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(Number(e.target.value))} className="p-2 rounded-md border ml-2">
                        {[...new Set(allTasks.map(task => new Date(task.date).getFullYear()))].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>


            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 text-center">{agentName}'s Performance - {year}</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-center">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="py-3 px-2">Metric</th>
                                {monthlyData.map(d => <th key={d.month} className="py-3 px-2">{d.month}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-200">
                                <td className="py-3 px-2 font-semibold">Hours</td>
                                {monthlyData.map((d, i) => <td key={i} className="py-3 px-2">{d.hours}</td>)}
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-3 px-2 font-semibold">Calls</td>
                                {monthlyData.map((d, i) => <td key={i} className="py-3 px-2">{d.calls}</td>)}
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-3 px-2 font-semibold">Spoke To</td>
                                {monthlyData.map((d, i) => <td key={i} className="py-3 px-2">{d.spokeTo}</td>)}
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-3 px-2 font-semibold">Listing Appts Set</td>
                                {monthlyData.map((d, i) => <td key={i} className="py-3 px-2">{d.listingApptsSet}</td>)}
                            </tr>
                             <tr className="border-b border-gray-200">
                                <td className="py-3 px-2 font-semibold">Buyer Appts Set</td>
                                {monthlyData.map((d, i) => <td key={i} className="py-3 px-2">{d.buyerApptsSet}</td>)}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>


            <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
                 <h3 className="text-xl font-semibold mb-4">All Tasks</h3>
                 <div className="overflow-y-auto max-h-96">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b-2">
                                <th className="p-2">Date</th>
                                <th className="p-2">Agent Name</th>
                                <th className="p-2">Task Type</th>
                                <th className="p-2">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => changeView('detail', task.id)}>
                                    <td className="p-2">{task.date}</td>
                                    <td className="p-2">{task.agentName}</td>
                                    <td className="p-2">{task.taskType || 'N/A'}</td>
                                    <td className="p-2">{task.hours || 'N/A'} hrs, {task.calls || 'N/A'} calls</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>


        </div>
    );
}


// --- Task Input Form Component ---
const TaskInputForm = ({ changeView }) => {
    const [formData, setFormData] = useState({
        timestamp: serverTimestamp(),
        date: new Date().toISOString().slice(0, 10),
        agentName: '',
        hours: '',
        calls: '',
        spokeTo: '',
        listingApptsSet: '',
        listingApptsHeld: '',
        listingContractsSigned: '',
        buyerApptsSet: '',
        buyerApptsHeld: '',
        buyerContractsSigned: '',
        taskType: 'Prospecting',
        // Add all other fields from the google sheet here...
    });


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "tasks"), formData);
            changeView('dashboard');
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    };


    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Add a New Task</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Basic Info */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="p-2 border rounded-md" />
                    <input type="text" name="agentName" placeholder="Agent Name" value={formData.agentName} onChange={handleChange} className="p-2 border rounded-md" required />
                    <select name="taskType" value={formData.taskType} onChange={handleChange} className="p-2 border rounded-md">
                        <option>Prospecting</option>
                        <option>Open Houses</option>
                        <option>Social Posts</option>
                        <option>Email Campaigns</option>
                        {/* Add more task types */}
                    </select>
                </div>


                {/* Core Metrics */}
                <input type="number" name="hours" placeholder="Hours" value={formData.hours} onChange={handleChange} className="p-2 border rounded-md" />
                <input type="number" name="calls" placeholder="Calls" value={formData.calls} onChange={handleChange} className="p-2 border rounded-md" />
                <input type="number" name="spokeTo" placeholder="Spoke To" value={formData.spokeTo} onChange={handleChange} className="p-2 border rounded-md" />


                 {/* Listing Appointments */}
                <h3 className="md:col-span-2 text-lg font-semibold mt-4">Listing Appointments</h3>
                <input type="number" name="listingApptsSet" placeholder="Listing Appts Set" value={formData.listingApptsSet} onChange={handleChange} className="p-2 border rounded-md" />
                <input type="number" name="listingApptsHeld" placeholder="Listing Appts Held" value={formData.listingApptsHeld} onChange={handleChange} className="p-2 border rounded-md" />
                <input type="number" name="listingContractsSigned" placeholder="Listing Contracts Signed" value={formData.listingContractsSigned} onChange={handleChange} className="p-2 border rounded-md" />


                {/* Buyer Appointments */}
                <h3 className="md:col-span-2 text-lg font-semibold mt-4">Buyer Appointments</h3>
                <input type="number" name="buyerApptsSet" placeholder="Buyer Appts Set" value={formData.buyerApptsSet} onChange={handleChange} className="p-2 border rounded-md" />
                <input type="number" name="buyerApptsHeld" placeholder="Buyer Appts Held" value={formData.buyerApptsHeld} onChange={handleChange} className="p-2 border rounded-md" />
                <input type="number" name="buyerContractsSigned" placeholder="Buyer Contracts Signed" value={formData.buyerContractsSigned} onChange={handleChange} className="p-2 border rounded-md" />
                
                <div className="md:col-span-2 text-right mt-6">
                     <button type="button" onClick={() => changeView('dashboard')} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full mr-2">
                        Cancel
                    </button>
                    <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full">
                        Submit Task
                    </button>
                </div>
            </form>
        </div>
    );
};


// --- Task Detail Component ---
const TaskDetail = ({ task, changeView }) => {
    if (!task) return <div>Loading task... or select a task to view details.</div>;


    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
             <button onClick={() => changeView('dashboard')} className="bg-gray-200 text-gray-700 py-1 px-3 rounded-full mb-4">
                &larr; Back to Dashboard
            </button>
            <h2 className="text-3xl font-bold mb-2">{task.agentName} - {task.date}</h2>
            <p className="text-lg text-gray-600 mb-6">Task Type: {task.taskType}</p>


            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Hours</p>
                    <p className="text-2xl font-semibold">{task.hours || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Calls</p>
                    <p className="text-2xl font-semibold">{task.calls || 0}</p>
                </div>
                 <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Spoke To</p>
                    <p className="text-2xl font-semibold">{task.spokeTo || 0}</p>
                </div>


                 <div className="col-span-full mt-4 border-t pt-4">
                    <h3 className="text-xl font-semibold">Listing Details</h3>
                </div>
                 <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Appts Set</p>
                    <p className="text-2xl font-semibold">{task.listingApptsSet || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Appts Held</p>
                    <p className="text-2xl font-semibold">{task.listingApptsHeld || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Contracts Signed</p>
                    <p className="text-2xl font-semibold">{task.listingContractsSigned || 0}</p>
                </div>


                <div className="col-span-full mt-4 border-t pt-4">
                    <h3 className="text-xl font-semibold">Buyer Details</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Appts Set</p>
                    <p className="text-2xl font-semibold">{task.buyerApptsSet || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Appts Held</p>
                    <p className="text-2xl font-semibold">{task.buyerApptsHeld || 0}</p>
                </div>
                 <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Contracts Signed</p>
                    <p className="text-2xl font-semibold">{task.buyerContractsSigned || 0}</p>
                </div>
            </div>
        </div>
    );
};