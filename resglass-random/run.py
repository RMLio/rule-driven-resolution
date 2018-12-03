#!/usr/bin/env python3

from rbo import rbo
import csv
import sys

def getVector(filename, topK):
    with open(filename) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        myMap = {}
        
        for row in csv_reader:
            if not row[1] in myMap:
                myMap[row[1]] = []
            myMap[row[1]].append(row[0])
        ranks = list(myMap)
        ranks.sort(reverse=True)

        vector = []

        if not topK or topK > len(ranks):
            topK = len(ranks)
      
        i = 0

        while i < topK:
            rank = ranks[i]
            vector.append(set(myMap[rank]))
            i += 1

        return vector

if __name__ == "__main__":
    topK = None

    if len(sys.argv) == 4:
        topK = int(sys.argv[3])

    v1 = getVector(sys.argv[1], topK)
    v2 = getVector(sys.argv[2], topK)
    result = rbo(v1, v2, p=0.8)

    print(str(result["ext"]))
#    print("res " + str(result["res"]))
#    print("min " + str(result["min"]))
