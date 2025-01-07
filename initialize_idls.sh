echo "Deploying IDLs"
bolt idl build -p grid -o target/idl/grid.json && bolt idl init 9EoKMqQqrgRAxVED34q17e466RKme5sTUkuCqUGH4bij --filepath target/idl/grid.json
bolt idl build -p join-game -o target/idl/join_game.json && bolt idl init 7TsTc97MB21EKbh2RetcWsGWRJ4xuMkPKKD4DcMJ2Sms --filepath target/idl/join_game.json
bolt idl build -p play -o target/idl/play.json && bolt idl init EFLfG5icLgcUYwuSnuScoYptcrgh8WYLHx33M4wvTPFv --filepath target/idl/play.json
bolt idl build -p players -o target/idl/players.json && bolt idl init HLzXXTbMUjemRSQr5LHjtZgBvqyieuhY8wE29xYzhZSX --filepath target/idl/players.json
bolt idl build -p match-queue -o target/idl/matchqueue.json && bolt idl init DRfvXQiMMKYm29bWUH71Gznw31QjqhD7SJUqfEjeCsQQ --filepath target/idl/matchqueue.json
bolt idl build -p matchmaker -o target/idl/matchmaker.json && bolt idl init DTyVdseiJgcLeX1JNWBKf2cjfk6TuGkkiiUd8hFF64dZ --filepath target/idl/matchmaker.json
