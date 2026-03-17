import React from 'react'
import './Nav1.css'

const Nav1 = () => {
  return (
    <>
    <div className='nav1'>
      <ul className='list1'>
        <li><img className='pics' height={70} width={70} src="https://rukminim1.flixcart.com/flap/128/128/image/29327f40e9c4d26b.png?q=100" alt="" />Grocery</li>
        <li><img className='pics' height={70} width={70} src="https://rukminim1.flixcart.com/flap/128/128/image/22fddf3c7da4c4f4.png?q=100" alt="" />Mobiles</li>
        <li><img className='pics' height={70} width={70} src="https://rukminim1.flixcart.com/fk-p-flap/128/128/image/0d75b34f7d8fbcb3.png?q=100" alt="" />Fashion</li>
        <li><img className='pics' height={70} width={70} src="https://rukminim1.flixcart.com/flap/128/128/image/69c6589653afdb9a.png?q=100" alt="" />Electronics</li>
        <li><img className='pics' height={70} width={70} src="https://rukminim1.flixcart.com/flap/128/128/image/ab7e2b022a4587dd.jpg?q=100" alt="" />Home</li>
        <li><img className='pics' height={70} width={70} src="https://rukminim1.flixcart.com/flap/128/128/image/0ff199d1bd27eb98.png?q=100" alt="" />Appliances</li>
        <li><img className='pics' height={70} width={70} src="https://rukminim1.flixcart.com/flap/128/128/image/71050627a56b4693.png?q=100" alt="" />Travel</li>
        <li><img className='pics' height={70} width={70} src="https://rukminim1.flixcart.com/flap/128/128/image/f15c02bfeb02d15d.png?q=100" alt="" />Top Offers</li>
        <li><img className='pics' height={70} width={70} src="https://rukminim1.flixcart.com/flap/128/128/image/dff3f7adcf3a90c6.png?q=100" alt="" />Beauty, Toys & More</li>
        <li><img className='pics' height={70} width={70} src="https://rukminim1.flixcart.com/fk-p-flap/128/128/image/05d708653beff580.png?q=100" alt="" />Two Wheelers</li>
      </ul>
    </div>
    <div id="carouselExampleControls" class="carousel slide" data-bs-ride="carousel">
    <div class="carousel-inner">
      <div class="carousel-item active">
        <img src="https://rukminim1.flixcart.com/flap/844/140/image/7b019cbf9d0c4186.jpg?q=50" class="d-block w-100" alt="..."/>
      </div>
      <div class="carousel-item">
        <img src="https://rukminim1.flixcart.com/fk-p-flap/844/140/image/a1d93b6bc446790d.jpg?q=50" class="d-block w-100" alt="..."/>
      </div>
      <div class="carousel-item">
        <img src="https://rukminim1.flixcart.com/fk-p-flap/844/140/image/a1d93b6bc446790d.jpg?q=50" class="d-block w-100" alt="..."/>
      </div>
    </div>
    <button class="carousel-control-prev" type="button" data-bs-target="#carouselExampleControls" data-bs-slide="prev">
      <span class="carousel-control-prev-icon" aria-hidden="true"></span>
      <span class="visually-hidden">Previous</span>
    </button>
    <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleControls" data-bs-slide="next">
      <span class="carousel-control-next-icon" aria-hidden="true"></span>
      <span class="visually-hidden">Next</span>
    </button>
  </div>
  </>
  )
}

export default Nav1