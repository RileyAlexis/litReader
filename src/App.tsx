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
      <input type="file" accept=".epub" onChange={handleFileSelect}></input>
      <BookScreen fileUrl={fileUrl} />

    </div>
  )
}

export default App
