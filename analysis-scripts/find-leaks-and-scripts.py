#!/usr/bin/env python3

import json
import os
import sys
from urllib.parse import urlparse

import matplotlib.pyplot as plt
import publicsuffix2
import networkx as nx

import LeakDetector
MAX_LEAK_DETECTION_LAYERS = 3

ETH_ADDR_WHATS_IN_YOUR_WALLET = "FDb672F061E5718eF0A56Db332e08616e9055548"
ETH_ADDR = "7e4ABd63A7C8314Cc28D388303472353D884f292"

class colors:
    INFO = '\033[94m'
    OK = '\033[92m'
    FAIL = '\033[91m'
    END = '\033[0m'

def log(msg):
    """Log the given message to stderr."""
    print("[+] " + msg, file=sys.stderr)

def parse_file(file_name):
    """Parse the given JSON file and return its content."""
    with open(file_name, "r") as fd:
            json_data = json.load(fd)
    return json_data

def get_etld1(url):
    """Return the given URL's eTLD+1."""
    fqdn = urlparse(url).netloc
    return publicsuffix2.get_sld(fqdn)

def has_eth_addr(url, eth_address):
    """Return True if the given URL contains our Ethereum address."""
    url = url.lower()
    return eth_address in url

def is_irrelevant(req):
    """Return True if the given request is irrelevant to our data analysis."""
    if req["url"].startswith("chrome-extension://"):
        return True
    return False

def are_unrelated(domain, origin):
    """Return True if the two given domains are likely independent."""
    if domain != None and "." in domain:
        if origin.split('.')[-2] in domain.split('.')[-2]:
            return False
    return domain != origin

def analyse_reqs(origin, reqs, G, script_nodes, edges, addr_leaks, post_leaks, eth_address):
    """Analyze the given requests for the given origin."""
    script_domains = set()
    req_dst = {}
    origin = get_etld1(origin)
    log("Analyzing requests for origin: "+colors.INFO+origin+colors.END)

    search_terms = [eth_address, eth_address.lower(), eth_address.upper()]

    detector = LeakDetector.LeakDetector(
        search_terms,
        encoding_set=LeakDetector.LIKELY_ENCODINGS,
        hash_set=LeakDetector.LIKELY_HASHES,
        encoding_layers=MAX_LEAK_DETECTION_LAYERS,
        hash_layers=MAX_LEAK_DETECTION_LAYERS,
        debugging=False
    )

    for req in reqs:
        if is_irrelevant(req):
            continue
        url = req["url"]
        domain = get_etld1(url)

        if domain != origin and domain != None:
            G.add_node(domain)
            script_domains.add(domain)
            script_nodes.add(domain)
            edges.append(tuple([origin, domain]))

        if are_unrelated(domain, origin):
            url_leaks_detected = detector.check_url(req["url"], encoding_layers=MAX_LEAK_DETECTION_LAYERS)
            if len(url_leaks_detected) > 0 or has_eth_addr(req["url"], eth_address.lower()):
                log(colors.OK+"Found leak (URL): "+req["url"]+colors.END)
                addr_leaks[origin] = addr_leaks.get(origin, 0) + 1
            if "postData" in req:
                post_leaks_detected = detector.check_post_data(req["postData"], encoding_layers=MAX_LEAK_DETECTION_LAYERS)
                if len(post_leaks_detected) > 0 or has_eth_addr(req["postData"], eth_address.lower()):
                    log(colors.OK+"Found leak (POST DATA): "+req["url"]+colors.END)
                    addr_leaks[origin] = addr_leaks.get(origin, 0) + 1
                    post_leaks[origin] = post_leaks.get(origin, 0) + 1

        req_dst[domain] = req_dst.get(domain, 0) + 1

    log("Found "+colors.INFO+str(len(script_domains))+colors.END+" third-party script(s).")

def print_leaks(total, addr_leaks, post_leaks, whats_in_your_wallet_leaks):
    """Print the number of Ethereum address leaks per DeFi origin."""
    log("")
    ratio = len(addr_leaks) / total * 100
    log("Found "+colors.INFO+str(len(addr_leaks))+"/"+str(total)+" ("+str(int(ratio))+"%)"+colors.END+" websites leaking the Ethereum wallet address.")
    log("Number of 3rd party leaks per origin:")
    for origin, num_leaks in sorted(addr_leaks.items(),
                                    key=lambda x: x[1],
                                    reverse=True):
        if origin in whats_in_your_wallet_leaks:
            if origin in post_leaks:
                print("  "+colors.OK+str(num_leaks)+" \t "+origin+" [P]"+colors.END+" ")
            else:
                print("  "+colors.OK+str(num_leaks)+" \t "+origin+colors.END+" ")
        else:
            if origin in post_leaks:
                print("  {} \t {} [P] ".format(num_leaks, origin))
            else:
                print("  {} \t {} ".format(num_leaks, origin))
    log(" [P] This indicates that leaks happened via HTTP POST requests.")

def print_sourced_script_popularity():
    """Print the domains whose scripts are sourced by DeFi sites."""

    sorted_script_domains = sorted(script_nodes, key=lambda x:
                                   len([edge for edge in set(edges)]),
                                   reverse=True)
    log("# of embedded 3rd party domains: {}".format(len(sorted_script_domains)))
    for script_domain in sorted_script_domains:
        num = len([e for e in set(edges) if script_domain in e])
        print("{} & {} \\\\".format(script_domain, num))

    n = len(set([edge[0] for edge in edges]))
    log("# of DeFi sites that embed at least one script: {} ({:.0%})".format(
        n, n / len(defi_nodes)))

    # Find all edges that point to Google.
    n = len(set([edge[0] for edge in edges if "google" in edge[1]]))
    log("# of DeFi sites that embed Google scripts: {} ({:.0%})".format(
        n, n / len(defi_nodes)))

def create_connectivity_graph():
    """Create a connectivity graph of DeFi sites and their sourced scripts."""
    pos = nx.bipartite_layout(G, defi_nodes, align="horizontal")
    options = {"edgecolors": "tab:gray", "node_size": 800, "alpha": 0.9}
    nx.draw_networkx_nodes(G, pos, nodelist=list(defi_nodes), node_color="tab:blue", **options)
    nx.draw_networkx_nodes(G, pos, nodelist=script_nodes, node_color="tab:red", **options)
    nx.draw_networkx_edges(G, pos, edgelist=edges, width=2, alpha=0.3, edge_color="tab:gray")

    labels = {key: key for key in defi_nodes}
    text = nx.draw_networkx_labels(G, pos, labels, font_size=22)
    for _, t in text.items():
        t.set_rotation('vertical')

    labels = {key: key for key in script_nodes}
    text = nx.draw_networkx_labels(G, pos, labels, font_size=22)
    for _, t in text.items():
        t.set_rotation('vertical')

    plt.tight_layout()
    plt.show()

def parse_directory(directory, eth_address):
    """Iterate over the given directory and parse its JSON files."""
    log("")
    log("Parsing "+colors.INFO+directory+colors.END+" directory...")

    G = nx.DiGraph()
    defi_nodes = set()
    script_nodes = set()
    edges = []
    addr_leaks = {}

    total_sites = 0
    post_leaks = {}

    for file_name in os.listdir(directory):
        file_name = os.path.join(directory, file_name)
        if not os.path.isfile(file_name) or not file_name.endswith(".json"):
            log("Skipping {}; not a JSON file.".format(file_name))
            continue

        total_sites += 1

        log("Parsing file: "+colors.INFO+file_name+colors.END)
        try:
            json_data = parse_file(file_name)
        except:
            print(colors.FAIL+"Error: Could not parse", file_name+colors.END)
            continue

        log("Extracted "+colors.INFO+str(len(json_data["requests"]))+colors.END+" reqs from file: "+colors.INFO+file_name+colors.END)

        # Add DeFi site as new node to dependency graph.

        defi_domain = get_etld1(json_data["url"])
        G.add_node(defi_domain)
        defi_nodes.add(defi_domain)

        analyse_reqs(json_data["url"], json_data["requests"], G, script_nodes, edges, addr_leaks, post_leaks, eth_address)
    return total_sites, addr_leaks, post_leaks

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: {} <DIRECTORY_WITH_LATEST_CRAWLS> <DIRECTORY_WITH_WHATS_IN_YOUR_WALLET_CRAWLS>".format(sys.argv[0]), file=sys.stderr)
        sys.exit(1)
    total_latest_sites, latest_leaks, post_leaks = parse_directory(sys.argv[1], ETH_ADDR)
    _, whats_in_your_wallet_leaks, _ = parse_directory(sys.argv[2], ETH_ADDR_WHATS_IN_YOUR_WALLET)

    # create_connectivity_graph()
    print_leaks(total_latest_sites, latest_leaks, post_leaks, whats_in_your_wallet_leaks)

    #print_sourced_script_popularity()
