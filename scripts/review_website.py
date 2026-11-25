"""Exercise the public site, gallery gestures, media budget and teaser release."""
from pathlib import Path
from threading import Thread
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import functools
import json
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/cache/website-review"
OUT.mkdir(parents=True, exist_ok=True)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def send_head(self):
        # Match production byte-range support so seeking to the end exercises
        # the end-frame behavior rather than restarting an unseekable stream.
        self.range_remaining = None
        path = Path(self.translate_path(self.path))
        header = self.headers.get('Range')
        if not header or not path.is_file() or path.suffix not in {'.mp4', '.webm'}:
            return super().send_head()
        size = path.stat().st_size
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', header)
        if match is None or not any(match.groups()):
            self.send_error(416, 'One valid byte range required')
            return None
        start, end = match.groups()
        if start:
            start = int(start)
            end = min(int(end) if end else size-1, size-1)
        else:
            start, end = max(0, size-int(end)), size-1
        if not 0 <= start <= end < size:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        stream = path.open('rb')
        stream.seek(start)
        self.range_remaining = end-start+1
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(self.range_remaining))
        self.end_headers()
        return stream

    def copyfile(self, source, outputfile):
        try:
            if self.range_remaining is None:
                return super().copyfile(source, outputfile)
            remaining = self.range_remaining
            while remaining:
                chunk = source.read(min(65536, remaining))
                if not chunk: break
                outputfile.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError): pass


def review_teaser(page):
    video = page.locator('#project-teaser')
    video.evaluate('''v => {window.__teaserEvents=[];for(const type of ['play','pause','ended','seeking','seeked','waiting'])v.addEventListener(type,()=>window.__teaserEvents.push({type,time:v.currentTime,paused:v.paused,ended:v.ended}));}''')
    assert not video.evaluate('v => v.loop || v.autoplay')
    video.scroll_into_view_if_needed()
    page.wait_for_function('!document.querySelector("#project-teaser").paused && document.querySelector("#project-teaser").currentTime > .15')
    video.evaluate('v => {v.currentTime = 6;}')
    page.wait_for_function('document.querySelector("#project-teaser").currentTime > 6.1')
    page.locator('#control').scroll_into_view_if_needed()
    page.wait_for_function('document.querySelector("#project-teaser").paused')
    position = video.evaluate('v => v.currentTime')
    page.wait_for_timeout(500)
    assert abs(video.evaluate('v => v.currentTime') - position) < .02
    video.scroll_into_view_if_needed()
    page.wait_for_function('position => {const v=document.querySelector("#project-teaser");return !v.paused && v.currentTime > position+.1;}', arg=position)
    # Native controls remain useful: a manual pause must survive scrolling.
    video.evaluate('v => v.pause()')
    position = video.evaluate('v => v.currentTime')
    page.locator('#control').scroll_into_view_if_needed()
    video.scroll_into_view_if_needed()
    page.wait_for_timeout(350)
    assert video.evaluate('v => v.paused')
    assert abs(video.evaluate('v => v.currentTime') - position) < .02
    video.evaluate('v => {v.currentTime = v.duration-.15;return v.play();}')
    try:
        page.wait_for_function('document.querySelector("#project-teaser").ended', timeout=5000)
    except Exception:
        print(video.evaluate('''v => ({time:v.currentTime,duration:v.duration,paused:v.paused,ended:v.ended,seeking:v.seeking,ready:v.readyState,error:v.error?.message,view:document.visibilityState,rect:v.getBoundingClientRect().toJSON(),events:window.__teaserEvents})'''),flush=True)
        raise
    page.locator('#control').scroll_into_view_if_needed()
    video.scroll_into_view_if_needed()
    page.wait_for_timeout(350)
    assert video.evaluate('v => v.ended && v.paused && Math.abs(v.currentTime-v.duration)<.02')
    video.evaluate('v => v.play()')
    page.wait_for_function('document.querySelector("#project-teaser").currentTime > .1 && document.querySelector("#project-teaser").currentTime < 1')
    video.evaluate('v => v.pause()')
    page.evaluate('scrollTo({top:0,behavior:"instant"})')


def review_authors(page):
    authors = page.locator('.hero-authors a')
    assert authors.evaluate_all('(links)=>links.map(a=>[a.textContent,a.getAttribute("href")])') == [
        ['Meenal Parakh', 'https://meenalparakh.github.io'],
        ['Deep Patel', 'https://deepsworld.github.io/'],
        ['Beining Han', 'https://beininghan.github.io/'],
        ['Jia Deng', 'https://www.cs.princeton.edu/~jiadeng/']]
    assert authors.evaluate_all('(links)=>{const r=links.map(a=>a.getBoundingClientRect());return r.every(a=>Math.abs(a.y-r[0].y)<1 && a.left>=0 && a.right<=innerWidth);}')


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
            assert page.locator('.teaser-embed video').get_attribute('src').split('?')[0] == 'tweet/run-43-v4/dexlink-run43-v4.mp4'
            assert page.locator('h1 .title-description').inner_text().replace('\n', ' ') == 'Synthesizing Dexterous Behaviors from Chained Hand-Object Poses'
            assert 'demonstrations' not in page.title().lower()
            review_authors(page)
            review_teaser(page)
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
            review_authors(phone)
            phone.screenshot(path=str(OUT/'phone-hero.png'))
            phone.set_viewport_size({'width':320,'height':844})
            review_authors(phone)
            assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
            phone.screenshot(path=str(OUT/'narrow-phone-hero.png'))
            phone.set_viewport_size({'width':390,'height':844})
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
            release.goto(base+'/tweet/run-43-v4/release/?clean=1',wait_until='domcontentloaded')
            release.wait_for_function('window.run42Ready===true',timeout=120000)
            for time in [0,11.9,12.54,17,28,36,41,48.5]:
                release.evaluate('t=>run42Seek(t)',time)
                assert abs(release.evaluate('run42State().time')-time)<.001
            assert release.evaluate("document.querySelector('iframe').contentWindow.run39Motion.finalSubtitle.textContent") == 'synthesizing dexterous behaviors fromchained hand-object poses'
            release.screenshot(path=str(OUT/'release-ending.png')); release.close(); browser.close()
    finally:
        server.shutdown(); server.server_close()
    assert not errors and not missing, (errors,missing)
    result=dict(desktop_and_phone_passed=True,mouse_drag=True,touch_swipe=True,carousel_arrows=True,
                teaser_pauses_offscreen=True,teaser_resumes_from_position=True,teaser_holds_last_frame=True,
                manual_pause_preserved=True,native_replay_works=True,linked_authors_single_row=True,
                task_filters_and_search=True,enlarged_playback=True,bounded_video_decoding=True,
                no_mobile_overflow=True,release_preview=True,page_errors=errors,missing=missing,samples=samples)
    (OUT/'validation.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2),flush=True)


if __name__=='__main__': main()
