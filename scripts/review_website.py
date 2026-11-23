"""Exercise the public site, gallery gestures, media budget and teaser release."""
from pathlib import Path
from threading import Thread
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import functools
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/cache/website-review"
OUT.mkdir(parents=True, exist_ok=True)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def copyfile(self, source, outputfile):
        try: super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError): pass


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    errors, missing, samples = [], [], []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'])
            page = browser.new_page(viewport={'width':1440,'height':1050})
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('response', lambda r: missing.append(r.url) if r.status >= 400 else None)
            page.goto(base, wait_until='domcontentloaded')
            page.wait_for_function('window.dexlinkSiteReady && window.dexlinkGallery?.ready', timeout=120000)
            page.evaluate('document.fonts.ready')
            assert page.evaluate('getComputedStyle(document.body).backgroundColor') == 'rgb(245, 244, 241)'
            assert 'IBM Plex Sans' in page.evaluate('getComputedStyle(document.body).fontFamily')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert page.locator('.teaser-embed video').get_attribute('src') == 'tweet/run-42-v9/dexlink-run42-v9.mp4'
            page.screenshot(path=str(OUT/'desktop-hero.png'))
            page.locator('#explorer-title').scroll_into_view_if_needed()
            page.locator('#task-viewport').scroll_into_view_if_needed()
            page.wait_for_timeout(1200)
            before = page.evaluate('dexlinkGallery.state'); assert before['tasks'] == before['filtered'] == 150
            assert 0 < before['liveVideos'] <= before['budget'] == 5, before
            assert before['cards'] == 5, before
            page.screenshot(path=str(OUT/'desktop-gallery.png'))
            box = page.locator('#task-viewport').bounding_box()
            page.mouse.move(box['x']+box['width']/2,box['y']+190); page.mouse.down()
            page.mouse.move(box['x']+box['width']/2-150,box['y']+180,steps=15); page.mouse.up()
            page.wait_for_timeout(600)
            after = page.evaluate('dexlinkGallery.state'); assert after['centerId'] != before['centerId'], (before, after)
            assert after['liveVideos'] <= 5 and after['cards'] == 5
            page.locator('#gallery-next').click(); page.wait_for_timeout(600)
            assert page.evaluate('dexlinkGallery.state.centerIndex') == (before['centerIndex']+2)%150
            page.locator('#gallery-pause').click(); page.wait_for_timeout(100)
            assert page.evaluate('dexlinkGallery.state.paused && dexlinkGallery.state.liveVideos===0')
            page.locator('#gallery-pause').click()
            page.select_option('#task-category','assembly'); page.wait_for_timeout(600)
            assert 10 < page.evaluate('dexlinkGallery.state.filtered') < 40
            page.locator('#task-search').fill('peg'); page.wait_for_timeout(600)
            assert 0 < page.evaluate('dexlinkGallery.state.filtered') < 20
            page.locator('.gallery-tile[aria-current="true"]').click()
            page.wait_for_function('document.querySelector("#task-dialog-video").currentTime>.05')
            assert page.locator('#task-dialog').is_visible()
            assert page.evaluate('dexlinkGallery.state.liveVideos') == 0
            page.locator('#task-dialog-close').click()
            page.locator('#task-search').fill('no such behavior'); page.wait_for_timeout(100)
            assert page.evaluate('dexlinkGallery.state.filtered') == 0
            assert page.locator('#gallery-loading').is_visible()
            page.locator('#task-search').fill(''); page.select_option('#task-category','all');page.wait_for_timeout(600)
            page.locator('#control').scroll_into_view_if_needed(); page.wait_for_timeout(700)
            page.screenshot(path=str(OUT/'desktop-control.png'))
            for section in ['#tasks','#dense-tracking','#reuse','#real-world']:
                page.locator(section).scroll_into_view_if_needed(); page.wait_for_timeout(500)
                assert not page.evaluate('[...document.querySelectorAll("video")].some(v=>v.error)'), section
            samples.append(page.evaluate('dexlinkGallery.state'))
            mobile = browser.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
            phone = mobile.new_page()
            phone.on('pageerror', lambda e: errors.append(str(e)))
            phone.on('response', lambda r: missing.append(r.url) if r.status>=400 else None)
            phone.goto(base,wait_until='domcontentloaded');phone.wait_for_function('window.dexlinkSiteReady && window.dexlinkGallery?.ready')
            assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth'), phone.evaluate('document.documentElement.scrollWidth')
            assert not phone.locator('.resource-rail').is_visible()
            phone.screenshot(path=str(OUT/'phone-hero.png'))
            phone.locator('#task-viewport').scroll_into_view_if_needed(); phone.wait_for_timeout(700)
            phone.screenshot(path=str(OUT/'phone-gallery.png'))
            initial = phone.evaluate('dexlinkGallery.state.centerId'); b=phone.locator('#task-viewport').bounding_box()
            assert phone.evaluate('dexlinkGallery.state.budget')==3
            cdp=mobile.new_cdp_session(phone); cx=b['x']+b['width']/2;cy=max(120,b['y']+130)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx+60,'y':cy,'id':1}]})
            for shift in [30,0,-30,-60]:
                cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':cx+shift,'y':cy,'id':1}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            phone.wait_for_timeout(600); assert phone.evaluate('dexlinkGallery.state.centerId') != initial
            assert phone.evaluate('dexlinkGallery.state.liveVideos')<=3
            phone.locator('#control').scroll_into_view_if_needed(); phone.wait_for_timeout(400)
            phone.screenshot(path=str(OUT/'phone-control.png'))
            samples.append(phone.evaluate('dexlinkGallery.state')); mobile.close()
            # The publishable animation preview must work without ignored drafts.
            release=browser.new_page(viewport={'width':1600,'height':900})
            release.on('pageerror',lambda e:errors.append(str(e)))
            release.on('response',lambda r:missing.append(r.url)if r.status>=400 else None)
            release.goto(base+'/tweet/run-42-v9/release/?clean=1',wait_until='domcontentloaded')
            release.wait_for_function('window.run42Ready===true',timeout=120000)
            for time in [0,11.9,12.54,17,28,36,41,48.5]:
                release.evaluate('t=>run42Seek(t)',time)
                assert abs(release.evaluate('run42State().time')-time)<.001
            release.screenshot(path=str(OUT/'release-ending.png')); release.close(); browser.close()
    finally:
        server.shutdown(); server.server_close()
    assert not errors and not missing, (errors,missing)
    result=dict(desktop_and_phone_passed=True,mouse_drag=True,touch_swipe=True,carousel_arrows=True,
                task_filters_and_search=True,enlarged_playback=True,bounded_video_decoding=True,
                no_mobile_overflow=True,release_preview=True,page_errors=errors,missing=missing,samples=samples)
    (OUT/'validation.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2),flush=True)


if __name__=='__main__': main()
