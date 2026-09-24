import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Quizora</h1>
        <p className="text-xl text-gray-700 mb-6">Live Classroom Quiz Platform</p>
        
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Status: </strong>
          <span className="block sm:inline">The application is running successfully.</span>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>Phase 1 Foundation Complete</p>
        </div>
      </div>
    </div>
  );
}

export default App;
