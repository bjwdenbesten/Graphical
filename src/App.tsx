import './App.css'
import Menu from './components/Menu';
import Graph from './components/Graph';
import Party from './components/Party';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';



function App() {
  return (
    <>
    <Router> 
      <Routes>
        <Route path="" element={<Menu/>}/>
        <Route path="/workspace" element={<Graph/>}/>
        <Route path="/login"/>
        <Route path= "/joinparty" element = {<Party/>}/>
        <Route path="/graph" element={<Graph/>}/>
      </Routes>

    </Router>
    </>
  )
}

export default App
