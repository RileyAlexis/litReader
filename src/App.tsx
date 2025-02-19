import { ChangeEvent, useState } from "react";
import { LitHeader } from "./components/LitHeader";
import { BookScreen } from "./components/BookScreen/BookScreen";

import './App.css';

function App() {
  const [rangeThing, setRangeThing] = useState(0);
  const [fileUrl, setFileUrl] = useState('');

  const handleRangeThing = (e: any) => {
    console.log(e.target.value);
    setRangeThing(e.target.value);
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    console.log('App.tsx', e.target.files?.[0]);
    const file = e?.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
    }
  }

  return (
    <div className="appContainer">
      <LitHeader />
      <h2>React on Safari 12</h2>
      <button>Im a Button!</button>
      <input type="text" placeholder="Text Input"></input>
      <input type="range" step={10} max={200} min={0} value={rangeThing} onChange={(e) => handleRangeThing(e)}></input>
      <span>{rangeThing}</span>
      <input type="file" onChange={handleFileSelect}></input>
      <BookScreen fileUrl={fileUrl} />

    </div>
  )
}

export default App
