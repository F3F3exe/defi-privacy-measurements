
import json
import LeakDetector

MAX_LEAK_DETECTION_LAYERS = 3

CHECK_REFERRER_LEAKS = True

def main(wallet_address, requests):
    search_terms = [wallet_address]

    detector = LeakDetector.LeakDetector(
        search_terms,
        encoding_set=LeakDetector.LIKELY_ENCODINGS,
        hash_set=LeakDetector.LIKELY_HASHES,
        encoding_layers=MAX_LEAK_DETECTION_LAYERS,
        hash_layers=MAX_LEAK_DETECTION_LAYERS,
        debugging=False
    )

    for request in requests:
        url_leaks = detector.check_url(request["url"], encoding_layers=MAX_LEAK_DETECTION_LAYERS)
        post_leaks = detector.check_post_data(request["postData"], encoding_layers=MAX_LEAK_DETECTION_LAYERS)
        print("url_leaks", url_leaks)
        print("post_leaks", post_leaks)

    if len(url_leaks + post_leaks) > 0:
        print("!!! Detected a leak !!!")


if __name__ == '__main__':
    wallet_address = '0x7e4ABd63A7C8314Cc28D388303472353D884f292'
    requests = list()
    with open("../browser extensions/intercepted_requests.json", "r") as f:
        requests = json.load(f)
    main(wallet_address, requests)
