#!/bin/bash

OUTPUTFILE=$1
SOURCE=ontology-terms_resglass.txt

for i in `seq 1 100`;
do
	node random.js $SOURCE > ontology-terms_random.txt

	RESULT_1=`python3.5 run.py ontology-terms_random.txt ontology-terms_1.txt`
	RESULT_2=`python3.5 run.py ontology-terms_random.txt ontology-terms_2.txt`
	RESULT_3=`python3.5 run.py ontology-terms_random.txt ontology-terms_3.txt`

	echo $i,$RESULT_1,$RESULT_2,$RESULT_3 >> $OUTPUTFILE
done
