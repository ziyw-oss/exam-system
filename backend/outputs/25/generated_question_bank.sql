INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 217, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 218, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 219, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 220, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 221, 5);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 222, 6);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 223, 7);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 224, 8);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 225, 9);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 226, 10);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 227, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 228, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 229, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 230, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 231, 5);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 232, 6);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 233, 7);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 234, 8);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 235, 9);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 236, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 237, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 238, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 239, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 240, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 241, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 242, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 243, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 244, 5);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 245, 6);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 246, 7);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 247, 8);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 248, 9);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 249, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 250, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 251, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 252, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (25, 253, 5);
INSERT INTO question_codeblock (question_bank_id, code) VALUES (219, '01 procedure bubbleSort(numbers : byRef)
02 flag = true
03 for x = 0 to numbers.length – 1
04 if numbers[x] > numbers[x + 1] then
05 holdValue = numbers[x]
06 numbers[x] = numbers[x + 1]
07 numbers[x + 1] = holdValue
08 flag = false
09 endif
10 next x
11 endprocedure');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (220, '(i) Explain why the procedure bubbleSort accepts the array numbers by reference and not by value. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (221, '(ii) The programmer has used a for loop on line 3 in the procedure bubbleSort. A for loop is a count controlled loop. State what is meant by the term ‘count controlled loop’. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (222, '(iii) State the purpose of the variable holdValue in the procedure bubbleSort. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (223, '(iv) The procedure bubbleSort will only partially sort the array numbers into order. Describe what the programmer would need to add to the algorithm to enable it to fully sort the numbers into order. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (227, 'Taylor is designing a program for a client who would like to simulate earthquakes on major cities around the world in 3D. The client would like to be able to view any stage of an earthquake such as: 1. the build-up of the earthquake 2. the earthquake taking place 3. the aftershocks of the earthquake. The client would also like to be able to play the simulation at different speeds. For example, a slow, normal or fast speed.');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (230, '(i) Identify two different inputs for this program. 1 ........................................................................................................................................ 2 ........................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (231, '(ii) One decision point in the program will be to decide if the user inputs are suitable or not. Identify two other example decision points in this program. 1 ........................................................................................................................................ 2 ........................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (234, '(ii) Give two reasons why the waterfall model is not suitable for Taylor. 1 ......................................................................................................................................... 2 .........................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (237, '25 / 2 = 12 remainder 1
12 / 2 = 6 remainder 0');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (239, 'The main program: • asks the user to enter a denary number between 1 and 255 • checks that the input is valid between 1 and 255 • If valid call the function toBinary() and pass the input as a parameter • outputs the return value • If not valid, repeatedly asks the user to input a number until the number is valid. Write the algorithm for the main program. You should write your algorithm using pseudocode or program code. .............................................................................................................................................. [4]');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (240, '01 total = 1
02 smallest = 9999
03 largest = -1
04 for x = 0 to 21
05 dataArray[x] = input("Enter a number")
06 total = total + dataArray[x]
07 if dataArray[x] < largest then
08 largest = dataArray[x]
09 endif
10 if dataArray[x] < smallest then
11 smallest = dataArray[x]
12 endif
13 next x
14 print("Average = " + total * 20)
15 print("Smallest = " + smallest)
16 print("Largest = " + largest)');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (250, 'The program needs to search the array for a number that is input by the user.');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (251, '(i) Describe how a linear search will search the data in the array for a number that has been input. ......................................................................................................................................');