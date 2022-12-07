import os

path_of_the_directory= '/mnt/c/Users/fwill/Documents/RA/Web3_Privacy_Project/defi-privacy-measurements/whats_in_your_wallet_urls'
path_of_the_out_directory= '/mnt/c/Users/fwill/Documents/RA/Web3_Privacy_Project/defi-privacy-measurements/whats_in_your_wallet_crawls'
for filename in os.listdir(path_of_the_directory):
    f = os.path.join(path_of_the_directory,filename)
    if os.path.isfile(f):
        file1 = open(f, "r")
        lines = file1.readlines()
        
        lastline = lines[len(lines) - 1]

        f2 = os.path.join(path_of_the_out_directory,filename)
        fileout = open(f2, "w")
        fileout.write(lastline)
        