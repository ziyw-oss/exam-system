INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 111, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 112, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 113, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 114, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 115, 5);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 116, 6);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 117, 7);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 118, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 119, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 120, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 121, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 122, 5);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 123, 6);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 124, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 16, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 125, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 126, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 127, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 128, 5);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 129, 6);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 130, 7);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 131, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 132, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 133, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 134, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 135, 5);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 136, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 137, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 138, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 139, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 140, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 141, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 142, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (27, 143, 4);
INSERT INTO question_codeblock (question_bank_id, code) VALUES (111, 'Ruhail owns ten different function rooms which can be hired by different business customers to hold meetings. He would like a program to manage the booking process of each room. Customers should be able to enter the date they want to hire a function room, and then a list of available rooms will be displayed. Customers can then select which room they want to hire. Customers can then enter their payment details which are then checked and then a confirmation email is sent to the customer.');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (118, 'Logan is writing a program for his customers to be able to buy his gym equipment. In the program, once a customer has selected the items they want to buy, a procedure, checkDetails, will be called. This procedure will check that the customer has input their telephone number and also check that it is at least 11 characters long.');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (119, 'Logan has written two possible versions of the procedure that could be used to achieve this. Version One: procedure checkDetails() telephoneNo = input("Enter telephone number") while (telephoneNo == "") or (telephoneNo.length < 11) print("Error, please try again") telephoneNo = input("Enter telephone number") endwhile endprocedure Version Two: procedure checkDetails() telephoneNo = input("Enter telephone number") if (telephoneNo == "") or (telephoneNo.length < 11) then print("Error, please try again") telephoneNo = input("Enter telephone number") endif endprocedure');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (121, '(ii) As well as the procedure checkDetails, Logan would like to use additional procedures to expand his program. The program will be expanded to: • allow customers to be able to register an account by setting up a username and password • allow registered users to be able to log-in with their registration details • allow customers, once logged in, to be able to add items that are in stock to their online shopping basket. State two other procedures that Logan could write to meet these requirements, and for each one, state a suitable name and purpose. Procedure 1: Procedure Name:  .............................................................................................................. Purpose:  ............................................................................................................................ Procedure 2: Procedure Name:  .............................................................................................................. Purpose:  ............................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (123, '* Logan will work in a team with five other programmers and together they will create the programming code for the program. Discuss how modularity can be used to allow the team of programmers to work effectively together on the same program at the same time. .............................................................................................................................................. [9]');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (126, '01 procedure bubbleSort(numbers)
02 do
03 sorted = true
04 for count = 0 to numbers.length -2
05 if numbers[count] > numbers[count+1] then
06 temp = numbers[count+1]
07 numbers[count+1] = numbers[count]
08 numbers[count] = temp
09 sorted = false
10 endif
11 next count
12 until sorted == true
13 endprocedure');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (127, '(i) Identify a line in the procedure bubbleSort where a decision is taken. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (128, '(ii) Identify the name of the parameter used in the procedure bubbleSort. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (129, '(iii) Describe the purpose of the temp variable in the procedure bubbleSort. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (130, '(iv) Describe the purpose of the sorted variable in the procedure bubbleSort. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (131, '01 procedure generate(number)
02 a = 0
03 while number > 0
04 if number MOD 2 == 0 then
05 a = a + 2
06 print(a)
07 number = number – 2
08 else
09 a = a + 1
10 print(a)
11 number = number – 1
12 endif
13 endwhile
14 endprocedure');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (132, 'Explain why = is used on line 11 of the procedure generate instead of ==. .............................................................................................................................................. [2]');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (133, 'State the values printed by the procedure generate when number = 8. .............................................................................................................................................. [1]');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (134, 'State the values printed by the procedure generate when number = 7. .............................................................................................................................................. [1]');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (135, 'Describe the purpose of the MOD operator on line 04 of the procedure generate. .............................................................................................................................................. [2]');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (136, 'A veterinary surgery uses a two dimensional array to store bookings for customers to bring in their animal to see the vet. There are ten possible booking slots during each day. An example of the two dimensional array is shown in Fig. 1. • The first column stores the booking slot number, ranging between 1 and 10. • The second column stores the time of the appointment. • The third column stores the customerID of the customer who has booked that slot. 1 9:00 5877RC 2 9:30 9655AS 3 10:00 4 10:30 8754TT 5 11:00 6 11:30 8745SD 7 13:00 9635GH 8 13:30 9 14:00 9874PL 10 14:30 9658SV Fig. 1 If a customerID has been entered for a booking slot then the booking slot has been taken. If no customerID has been entered then the booking slot is available for booking.');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (137, 'When customers make an appointment they often ask for the first available booking slot. Describe how a linear search could be used for this purpose. .............................................................................................................................................. [3]');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (138, 'A function findFirst, is used to find the first available appointment. Write the function findFirst that will find the first available appointment and return the booking slot number. If no appointments are available then the function should return "-1". You should write your function using pseudocode or program code. .............................................................................................................................................. [7]');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (139, 'When an available time slot has been found then a valid customerID must be entered to confirm the booking. This is checked by another function called checkCustomerID. This will return true if the customerID is valid or false if the customerID is not valid. State why a function would be used instead of a procedure for this purpose. .............................................................................................................................................. [1]');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (140, '01 total = input("Enter total price of goods")
02 paid = input("Enter amount paid”)
03 global change = paid – total
04 calculateChange()');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (142, 'When line 22 is run, it will always print: The amount of change you need is £0 Explain why this error occurs when line 22 is run. .............................................................................................................................................. [2]');