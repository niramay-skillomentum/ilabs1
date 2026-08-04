"use client";

import React, { useState } from 'react';
import { useCommandEngine } from './hooks/useCommandEngine';
import Header from './components/Header';
import Workspace from './components/Workspace';
import Footer from './components/Footer';
import './styles/bloomberg.css';

export default function BloombergApp() {
  const { state, executeCommand, setScreen, goBack, goForward, canGoBack, canGoForward } = useCommandEngine();
  
  return (
    <div className="bloomberg-terminal">
      <Header 
        executeCommand={executeCommand}
        activeScreen={state.screen}
        setScreen={(screen) => setScreen({ screen, parameter: null })}
        goBack={goBack}
        goForward={goForward}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
      />
      <Workspace state={state} />
      <Footer />
    </div>
  );
}
