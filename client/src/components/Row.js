import React from 'react';
import "../styles/row.scss";
import Pixel from './Pixel'

export default function Row(props) {
    const { width, selectedColor, dragging, changeColor, pixelColors} = props;
    let pixels = [];

    for(let j = 0; j < width; j++) {
        pixels.push(<Pixel key={j} selectedColor={selectedColor} dragging={dragging} changeColor={(new_val) => changeColor(j, new_val)} pixelColor={pixelColors[j]} />);
    }
    
    return (
        <div className="row">{pixels}</div>
    );
}