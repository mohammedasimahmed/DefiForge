"use client";
import React, { useEffect, useRef } from "react";

const WebsiteLoadUp = () => {
  const presentRef = useRef(null);
  const circleRef = useRef(null);
  const loadUpRef = useRef(null);

  useEffect(() => {
    presentRef.current.style.opacity = 1;
    presentRef.current.style.transform = "translateY(0px)";
    circleRef.current.classList.add("growing-circle");
  }, []);

  return (
    <div
      ref={loadUpRef}
      id="loadUp"
      className="opacity-1 w-screen h-screen flex justify-center items-center relative transition duration-1000"
      style={{
        zIndex: "200",
        backgroundColor: "rgb(5, 5, 30)",
      }}
    >
      <div
        ref={presentRef}
        id="presenting"
        className=" opacity-0 transition duration-1000 text-7xl translate-y-5"
      >
        DefiForge presents
      </div>
      <div ref={circleRef} className=" absolute"></div>
    </div>
  );
};

export default WebsiteLoadUp;
