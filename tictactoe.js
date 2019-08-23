//Tic Tac Toe Lisk blockchain demo - korben3 - Sidechain Solutions - 2019
//

//set a few global variables and setup connection to the lisk network
const {Mnemonic}=lisk.passphrase; // used for generating BIP39-compliant mnemonic passphrases
const passphrase = Mnemonic.generateMnemonic(); // generate a passphrase
var network='test'; // use 'test' for Lisk testnet or 'main' for mainnet
var gameAddress=''; // game address used to retrieve the game moves
var scoresAddress = '';
const registerScoreAmount = 1; // Required amount to register a score in beddows (1 beddow)
var timer=0;
if (network=="test") {
   var networkClient=lisk.APIClient.createTestnetAPIClient();
   scoresAddress = '1465910065587028555L';
} else {
   var networkClient=lisk.APIClient.createMainnetAPIClient();
   scoresAddress = '1465910065587028555L';
}

function newGame(){
	if(gameAddress!=''){
		if(!confirm('Would you like to start a new Game?')){ return; }
	}

	clearInterval(timer);
	gameAddress=lisk.cryptography.getAddressFromPassphrase(passphrase) // get address from generated passphrase
	$("#message").html('Please share the following game address: '+gameAddress);
	showGameAddress(gameAddress);
	resetGame();
	timer=setInterval(checkGameAddress,5000); // check address every 5 seconds
}

function joinGameInput(){
	if(gameAddress!=''){
		if(!confirm('Would you like to join a new Game?')){ return; }
	}	
	clearInterval(timer);
	$("#message").html('<input name="gameAddressJoin" id="gameAddressJoin" type="text" placeHolder="Game Address" size=21> <button type="button" onclick="joinGame()">SUBMIT</button>');
}

function joinGame(){
	if($("#gameAddressJoin").val().search(/^\d{1,21}[L]$/)==-1){
		alert('Please enter a correct address');
	}else{
		gameAddress=$("#gameAddressJoin").val();
		$('#message').html('Joining game.. ');
		showGameAddress(gameAddress);
		resetGame();
		timer=setInterval(checkGameAddress,5000); // check address every 5 seconds
	}
}

function resetGame(){
	$('#playerXAddress').html('');
	$('#playerOAddress').html(''); // make reset field function	
	for  (var x=0; x<3; x++){
		for  (var y=0; y<3; y++){
			$('#'+x+y).css("color","#ffffff");
		}
	}	
}

function drawField(playfield){
	for  (var x=0; x<3; x++){
		for  (var y=0; y<3; y++){
			$('#'+x+y).html(playfield[x][y]);
		}
	}
}

function showGameAddress(gameAddress){
	if(network=='test'){	
		$("#gameAddress").html('Current game address: <a href="https://testnet-explorer.lisk.io/address/'+gameAddress+'" target="_blank">'+gameAddress+'</a>');
	}else{
		$("#gameAddress").html('Current game address: <a href="https://explorer.lisk.io/address/'+gameAddress+'" target="_blank">'+gameAddress+'</a>');
	}
	
	// generate a QR code which can be used by Lisk Mobile (currently only for mainnet)
	$('#gameAddressQR').css("background-color","white");
	$('canvas').remove(); // remove the canvas element containing the QR code before placing a new one
 	jQuery("#gameAddressQR").qrcode({
		width: 128,
		height: 128,
		text: 'lisk://wallet?recipient='+gameAddress+'&amount=0.00000001'
	});	
}

function checkWinner(id,playfield){
	//check horizontal rows -
	for  (var y=0; y<3; y++){
		if(playfield[0][y]==id && playfield[1][y]==id && playfield[2][y]==id){
			$('#0'+y).css("color","#4caf50"); $('#1'+y).css("color","#4caf50"); $('#2'+y).css("color","#4caf50");
			return true;
		}
	}

	//check vertical rows |
	for  (var x=0; x<3; x++){
		if(playfield[x][0]==id && playfield[x][1]==id && playfield[x][2]==id){
			$('#'+x+'0').css("color","#4caf50"); $('#'+x+'1').css("color","#4caf50"); $('#'+x+'2').css("color","#4caf50");
			return true;
		}
	}

	//check diagonal rows /
	if(playfield[0][0]==id && playfield[1][1]==id && playfield[2][2]==id){
		$('#00').css("color","#4caf50"); $('#11').css("color","#4caf50"); $('#22').css("color","#4caf50");
		return true;
	}
	if(playfield[2][0]==id && playfield[1][1]==id && playfield[0][2]==id){
		$('#20').css("color","#4caf50"); $('#11').css("color","#4caf50"); $('#02').css("color","#4caf50");
		return true;
	}	
}

function getDelegateName(id, senderId){
	//check if a registered delegate is playing and use it's name if available else use the senders address
	networkClient.delegates.get({"address":senderId,"limit":1})
	.then(res => {
		try{var delegateName=res.data[0].username}catch(e){delegateName=senderId};
		$('#player'+id+'Address').html('Player '+id+': '+delegateName); 
	}).catch(console.error);
}

/**
 * @returns {int} Lisk default transaction fee in beddows
 */
function getDefaultLiskTransactionFee() {
   const fixed = Math.pow(10, 8);
   return 0.1 * fixed; // 0.1 LSK in beddows
}

/**
 * @param {string} recipient - The address of the recipient
 * @param {string} amount - Amount in beddows
 * @param {string | null} - Optional message to include in the transaction asset
 */
function createAndBrodcastTransaction(recipient, amount, message = null) {
   console.log(recipient, amount, message)
   const transaction = lisk.transaction.transfer({
      amount: amount,
      recipientId: recipient,
      passphrase: passphrase, // game address's passphrase
      data: message
   });
   networkClient.transactions.broadcast(transaction)
      .then(console.info)
      .catch(console.error);
}

/**
 * Note: In case of tie, register score transaction data field will be empty
 * @param {string} xAddress - Player X's account 
 * @param {string} oAddress - Player O's account 
 */
function refundPlayersAndRegisterScore(xAddress, oAddress) {
   networkClient.accounts.get({ address: gameAddress })
      .then(res => {
         const gameBalance = parseInt(res.data[0].balance);
         const defaultTransactionFee = getDefaultLiskTransactionFee();
         const fees = defaultTransactionFee * 3; // refund both players and register score
         const availableRefund = gameBalance - (registerScoreAmount + fees);
         // Since beddow is non-divisible unit, after splitting the available refund between players 
         // the remaining is added to the score registration transaction.
         const refundAmount = Math.floor(availableRefund / 2)
         const regScoreAmount = gameBalance - refundAmount * 2 - fees;

         createAndBrodcastTransaction(xAddress, refundAmount.toString()); // refund player X
         createAndBrodcastTransaction(oAddress, refundAmount.toString()); // refund player O
         createAndBrodcastTransaction(scoresAddress, regScoreAmount.toString()); // register score
      })
      .catch(console.error);
}

/**
 * Note: Register score transaction data field will contain winner address
 * @param {string} winnerAddress 
 */
function refundWinnerAndRegisterScore(winnerAddress) {
   networkClient.accounts.get({ address: gameAddress })
      .then(res => {
         const gameBalance = parseInt(res.data[0].balance, 10);
         const transactionsFee = getDefaultLiskTransactionFee() * 2; // refund and register score
         const refundAmount = gameBalance - (registerScoreAmount + transactionsFee);

         createAndBrodcastTransaction(winnerAddress, refundAmount.toString()); // refund
         createAndBrodcastTransaction(scoresAddress, registerScoreAmount.toString(), winnerAddress); // register score
      })
      .catch(console.error);
}

function showScoresAddress() {
   if (network=='test'){	
		$("#scoresAddress").html('All scores address: <a href="https://testnet-explorer.lisk.io/address/'+scoresAddress+'" target="_blank">'+scoresAddress+'</a>');
	} else {
		$("#scoresAddress").html('All scores address: <a href="https://explorer.lisk.io/address/'+scoresAddress+'" target="_blank">'+scoresAddress+'</a>');
   }
}

function checkGameAddress(){
	console.log('checking games address..');
	var data='';
	var lastSender='';
	var playerXAddress='';
	var playerOAddress='';
	var playfield=[['','',''],['','',''],['','','']]; // create a multidimensional array
	var positionsFilled=0;
	
	networkClient.transactions.get({recipientId:gameAddress, limit:100, offset:0, sort:'timestamp:asc'})
	.then(res => {
		
		// check if it's a new game, if so add a welcome message and instructions
		if(res.data.length==0){$("#message").html('Welcome, player X send your move to: '+gameAddress);}
		
		// loop through all transactions sent to the game address
		for (var i=0; i<res.data.length; i++) { 
			
			data=res.data[i].asset.data.toUpperCase();
			var senderId=res.data[i].senderId;
			
			// only perform a move if: data is formated correctly and the current sender is not the same as the last sender
			if(data.search(/[ABC][123]/)==0 && lastSender!=senderId){
				console.log('ok: '+data);
				
				x="ABC".indexOf(data.charAt(0));  //convert characters from the message field to postions in the array
				y=parseInt(data.charAt(1))-1;
				
				if(playfield[x][y]==""){
				
					// establish player addresses
					if(playerXAddress==''){
						playerXAddress=senderId;
						getDelegateName('X',playerXAddress);
					}else if(playerOAddress==''){
						playerOAddress=senderId;
						getDelegateName('O',playerOAddress);
					}

					// place X or O 
					if(senderId==playerXAddress){
						playfield[x][y]="X";
						$("#message").html('Player O send your move to: '+gameAddress);
					}else{
						playfield[x][y]="O";
						$("#message").html('Player X send your move to: '+gameAddress);
					}
					
					lastSender=senderId; 
					positionsFilled++; // keep count of the total filled in positions
					
				}else{
					console.log('Position not empty: '+data);
				}
			}else{
				console.log('Invalid data or move not allowed: '+data);
			}
		}
		drawField(playfield);
		
		// check if there's a tie or winner
		if(positionsFilled===9){
         $("#message").html('It is a tie!');
         refundPlayersAndRegisterScore(playerXAddress, playerOAddress)
			clearInterval(timer);			
		}
		if(checkWinner('X',playfield)){
         $("#message").html('Congratulations, player X won the game!');
         refundWinnerAndRegisterScore(playerXAddress)
			clearInterval(timer);
		}
		if(checkWinner('O',playfield)){
         $("#message").html('Congratulations, player O won the game!');
         refundWinnerAndRegisterScore(playerOAddress)
			clearInterval(timer);
		}
	})
	.catch(console.error);
}

$(document).ready(function(){
	// display the connected network
   $("#gameAddressNetwork").html('Connected to Lisk: '+network+'net');
   showScoresAddress()
});
