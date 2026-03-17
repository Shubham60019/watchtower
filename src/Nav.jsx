import React from 'react'
import './Nav.css'
import SearchIcon from '@mui/icons-material/Search';
import Logo from './Flipkart  Images/logo.png'
import EXP from './Flipkart  Images/explore.png'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
// import { colors } from '@mui/material';

const Nav = () => {
  return (
    <div id='nav'>
          <div>
            <div className='logo'><img height={19} width={70} src={Logo} alt="" /></div>
            <div className='expo'><i className='explore'>Explore </i><i className='plus'>Plus</i><img className='plus1' height={12} width={12} src={EXP} alt="" /></div>
          </div>
          <div><input className='search' type="search" placeholder='     Search for products, brands and more'/><SearchIcon className='searchIcon'/></div>
          <div><button className='btn mx-2'><b className='login'>Login</b></button></div>
          <ul className='list'>
            <li>Become a Seller</li>
            <li><select name="more" id="more"><option value="more">More</option></select></li>
            <li><ShoppingCartIcon className='ShoppingCartIcon'/>Cart</li>
          </ul>
    </div>
  )
}

export default Nav