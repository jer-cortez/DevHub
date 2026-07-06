"use client";
import React , {useEffect, useState} from "react";

function index() {

  const [message, setMessage] = useState("Loading");
  const [pet, setPet] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/home").then(
      (response) => response.json()
    ).then(
        data => { 
          console.log(data)
          setMessage(data.message)
          setPet(data.pet)
        } 
        )
  }, []);


  return (
    <div>
      <div>{message}</div>
      {pet.map((name, index) => (
        <div key={index}>{name}</div>
      ))
        }
    </div>
  );
}

export default index;
