<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Jessica Finance | Login</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<style>

*{
margin:0;
padding:0;
box-sizing:border-box;
font-family:'Poppins',sans-serif;
}

body{

background:#f4f6ff;
height:100vh;
display:flex;
justify-content:center;
align-items:center;

}

.container{

width:1100px;
height:650px;
background:#fff;
border-radius:30px;
overflow:hidden;
display:flex;
box-shadow:0 20px 50px rgba(0,0,0,.12);

}

.left{

width:45%;
background:linear-gradient(160deg,#4b00b5,#7b2cff);
color:#fff;
display:flex;
flex-direction:column;
justify-content:center;
align-items:center;
padding:40px;
text-align:center;

}

.logo{

width:120px;
height:120px;
border-radius:50%;
background:#fff;
color:#6b2cff;
font-size:65px;
display:flex;
align-items:center;
justify-content:center;
font-weight:bold;
margin-bottom:30px;

}

.left h1{

font-size:55px;

}

.left h2{

font-size:35px;
color:#ffd54f;
margin-bottom:20px;

}

.left p{

font-size:18px;
opacity:.9;

}

.features{

margin-top:50px;
display:flex;
gap:35px;

}

.feature{

text-align:center;
font-size:15px;

}

.right{

width:55%;
display:flex;
justify-content:center;
align-items:center;

}

.login{

width:75%;

}

.login h1{

font-size:45px;
color:#222;
margin-bottom:10px;

}

.login p{

color:#777;
margin-bottom:40px;

}

.input{

margin-bottom:25px;

}

.input label{

display:block;
margin-bottom:8px;
font-weight:600;

}

.input input{

width:100%;
height:55px;
border:2px solid #ddd;
border-radius:12px;
padding-left:20px;
font-size:16px;

}

.input input:focus{

border-color:#6b2cff;
outline:none;

}

button{

width:100%;
height:58px;
border:none;
border-radius:12px;
background:#6b2cff;
color:#fff;
font-size:18px;
font-weight:bold;
cursor:pointer;
transition:.3s;

}

button:hover{

background:#4d00d8;

}

.bottom{

margin-top:35px;
text-align:center;
color:#777;

}

@media(max-width:900px){

.container{

width:95%;
height:auto;
flex-direction:column;

}

.left,.right{

width:100%;
padding:50px 30px;

}

.left h1{

font-size:40px;

}

.login{

width:100%;

}

}

</style>

</head>
<body>

<div class="container">

<div class="left">

<div class="logo">J</div>

<h1>Jessica</h1>

<h2>Finance</h2>

<p>Trusted Finance. Better Future.</p>

<div class="features">

<div class="feature">
🛡️
<br><br>
Secure
</div>

<div class="feature">
👥
<br><br>
Customers
</div>

<div class="feature">
📈
<br><br>
Growth
</div>

</div>

</div>

<div class="right">

<div class="login">

<h1>Welcome Back!</h1>

<p>Login to your account</p>

<form action="/login" method="POST">

<div class="input">

<label>User ID</label>

<input
type="text"
name="userid"
placeholder="Enter User ID"
required>

</div>

<div class="input">

<label>Password</label>

<input
type="password"
name="password"
placeholder="Enter Password"
required>

</div>

<button type="submit">

Login

</button>

</form>

<div class="bottom">

Admin & Customer Login

</div>

</div>

</div>

</div>

</body>
</html>