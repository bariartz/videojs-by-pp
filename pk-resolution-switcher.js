  /*! videojs-resolution-switcher for VideoJS Version 7+ - 2020-7-17
 * Copyright (c) 2016 Kasper Moskwiak
 * Modified by Poko Chan - https://facebook.com/pokonimeii
 * Licensed under the Apache-2.0 license. */

(function () {
    'use strict';
    var videojs = null;
    if (typeof window.videojs === 'undefined' && typeof require === 'function') {
        videojs = require('video.js')
    } else {
        videojs = window.videojs
    }(function (window, videojs) {
        var defaults = {},
            videoJsResolutionSwitcher, currentResolution = {},
            menuItemsHolder = {};

        function setSourcesSanitized(player, sources, label, customSourcePicker) {
            currentResolution = {
                label: label,
                sources: sources
            };
            if (typeof customSourcePicker === 'function') {
                return customSourcePicker(player, sources, label)
            }
            return player.src(sources.map(function (src) {
                return {
                    src: src.src,
                    type: src.type,
                    res: src.res
                }
            }))
        }
        var MenuItem = videojs.getComponent('MenuItem');
        var ResolutionMenuItem = videojs.extend(MenuItem, {
            constructor: function (player, options, onClickListener, label) {
                this.onClickListener = onClickListener;
                this.label = label;
                MenuItem.call(this, player, options);
                this.src = options.src;
                this.on('click', this.onClick);
                this.on('touchstart', this.onClick);
                if (options.initialySelected) {
                    this.showAsLabel();
                    this.selected(!0);
                    this.addClass('vjs-selected')
                }
            },
            showAsLabel: function () {
                if (this.label) {
                    var lbl = this.options_.label;
//                     var res_num = lbl.replace('p', '');
//                     res_num = parseInt(res_num);
                    if (lbl) {
                        if (lbl == "HD") this.label.innerHTML = '<span class="vjs-hd-icon">HD</span>';
                        else if (lbl == "FHD") this.label.innerHTML = '<span class="vjs-hk-icon">FHD</span>';
                        else if (lbl == "4K") this.label.innerHTML = '<span class="vjs-shk-icon">4K</span>'
                    } else {
                        this.label.innerHTML = lbl
                    }
                }
            },
            onClick: function (customSourcePicker) {
                this.onClickListener(this);
                var currentTime = this.player_.currentTime();
                var isPaused = this.player_.paused();
                this.showAsLabel();
                this.addClass('vjs-selected');
                if (!isPaused) {
                    this.player_.bigPlayButton.hide()
                }
                if (typeof customSourcePicker !== 'function' && typeof this.options_.customSourcePicker === 'function') {
                    customSourcePicker = this.options_.customSourcePicker
                }
                var handleSeekEvent = 'loadeddata';
                if (this.player_.techName_ !== 'Youtube' && this.player_.preload() === 'none' && this.player_.techName_ !== 'Flash') {
                    handleSeekEvent = 'timeupdate'
                }
                this.player_.setSourcesSanitized(this.src, this.options_.label, customSourcePicker || settings.customSourcePicker ).one(handleSeekEvent, function () {
                    if (this.player_.techName_ == "Flash") {
                        currentTime = 0
                    } else {
                        this.player_.currentTime(currentTime);
                        this.player_.play().handleTechSeeked_()
                    }
                    this.player_.handleTechSeeked_();
                    if (!isPaused) {
                        this.player_.play().handleTechSeeked_()
                    } else {
                        if (this.player_.techName_ == "Flash") {
                            this.player_.play()
                        }
                    }
                    this.player_.trigger('resolutionchange')
                })
            }
        });
        var MenuButton = videojs.getComponent('MenuButton');
        var ResolutionMenuButton = videojs.extend(MenuButton, {
            constructor: function (player, options, settings, label) {
                this.sources = options.sources;
                this.label = label;
                this.label.innerHTML = options.initialySelectedLabel;
                MenuButton.call(this, player, options, settings);
                this.controlText('Kualitas');
                if (settings.dynamicLabel) {
                    this.el().appendChild(label)
                } else {
                    var staticLabel = document.createElement('span');
                    videojs.dom.addClass(staticLabel, 'vjs-resolution-button-staticlabel');
                    this.el().appendChild(staticLabel)
                }
            },
            createItems: function () {
                var menuItems = [];
                var labels = (this.sources && this.sources.label) || {};
                var onClickUnselectOthers = function (clickedItem) {
                    menuItems.map(function (item) {
                        item.selected(item === clickedItem);
                        item.removeClass('vjs-selected')
                    })
                };
                for (var key in labels) {
                    if (labels.hasOwnProperty(key)) {
                        menuItems.push(new ResolutionMenuItem(this.player_, {
                            label: key,
                            src: labels[key],
                            initialySelected: key === this.options_.initialySelectedLabel,
                            customSourcePicker: this.options_.customSourcePicker
                        }, onClickUnselectOthers, this.label));
                        menuItemsHolder[key] = menuItems[menuItems.length - 1]
                    }
                }
                return menuItems
            }
        });
        videoJsResolutionSwitcher = function (options) {
            var settings = videojs.mergeOptions(defaults, options),
                player = this,
                label = document.createElement('span'),
                groupedSrc = {};
            videojs.dom.addClass(label, 'vjs-resolution-button-label');
            videojs.dom.addClass(label, 'vjs-resolution-type');
            settings.dynamicLabel = !0;
            player.updateSrc = function (src) {
                if (!src) {
                    return player.src()
                }
                if (player.controlBar.resolutionSwitcher) {
                    player.controlBar.resolutionSwitcher.dispose();
                    delete player.controlBar.resolutionSwitcher
                }
                src = src.sort(compareResolutions);
                groupedSrc = bucketSources(src);
                var choosen = chooseSrc(groupedSrc, src);
                var menuButton = new ResolutionMenuButton(player, {
                    sources: groupedSrc,
                    initialySelectedLabel: choosen.label,
                    initialySelectedRes: choosen.res,
                    customSourcePicker: settings.customSourcePicker
                }, settings, label);
                videojs.dom.addClass(menuButton.el(), 'vjs-resolution-button');
                player.controlBar.resolutionSwitcher = player.controlBar.el_.insertBefore(menuButton.el_, player.controlBar.getChild('fullscreenToggle').el_);
                player.controlBar.resolutionSwitcher.dispose = function () {
                    this.parentNode.removeChild(this)
                };
                return setSourcesSanitized(player, choosen.sources, choosen.label)
            };
            player.currentResolution = function (label, customSourcePicker) {
                if (label == null) {
                    return currentResolution
                }
                if (menuItemsHolder[label] != null) {
                    menuItemsHolder[label].onClick(customSourcePicker)
                }
                return player
            };
            player.getGroupedSrc = function () {
                return groupedSrc
            };

            function compareResolutions(a, b) {
                if (!a.res || !b.res) {
                    return 0
                }
                return (+b.res) - (+a.res)
            }

            function bucketSources(src) {
                var resolutions = {
                    label: {},
                    res: {},
                    type: {},
                    first: {}
                };
                src.map(function (source) {
                    if (source.default) {
                        source.first = 'yes'
                    } else {
                        source.first = 'no'
                    }
                    initResolutionKey(resolutions, 'label', source);
                    initResolutionKey(resolutions, 'res', source);
                    initResolutionKey(resolutions, 'type', source);
                    initResolutionKey(resolutions, 'first', source);
                    appendSourceToKey(resolutions, 'label', source);
                    appendSourceToKey(resolutions, 'res', source);
                    appendSourceToKey(resolutions, 'type', source);
                    appendSourceToKey(resolutions, 'first', source)
                });
                return resolutions
            }

            function initResolutionKey(resolutions, key, source) {
                if (resolutions[key][source[key]] == null) {
                    resolutions[key][source[key]] = []
                }
            }

            function appendSourceToKey(resolutions, key, source) {
                resolutions[key][source[key]].push(source)
            }

            function chooseSrc(groupedSrc, src) {
                var selectedRes = settings['default'];
                var selectedLabel = '';
                for (var i = 0; i < src.length; i++) {
                    if (src[i].first == 'yes') {
                        selectedRes = src[i].res;
                        selectedLabel = src[i].label;
                        break
                    }
                }
                if (selectedLabel == '') {
                    selectedRes = src[0].res;
                    selectedLabel = src[0].label
                }
                settings.resolutionLabel = !0;
                return {
                    res: selectedRes,
                    label: selectedLabel,
                    sources: groupedSrc.res[selectedRes]
                }
            }

            function initResolutionForYt(player) {
                player.tech_.ytPlayer.setPlaybackQuality('large');
                player.tech_.ytPlayer.addEventListener('onPlaybackQualityChange', function () {
                    player.trigger('resolutionchange')
                });
                player.one('play', function () {
                    try {
                        var quties = player.tech_.ytPlayer.getAvailableQualityLevels();
                        var cquality = player.tech_.ytPlayer.getPlaybackQuality();
                        var qualities = new Array();
                        for (var z = 0; z < quties.length; z = z + 1) {
                            if (quties[z] != 'auto') qualities.push(quties[z])
                        }
                        var _yts = {
                            hd1080: {
                                res: '1080p',
                                label: '1080',
                                yt: 'hd1080'
                            },
                            hd720: {
                                res: '720',
                                label: '720p',
                                yt: 'hd720'
                            },
                            large: {
                                res: '480p',
                                label: '480p',
                                yt: 'large'
                            },
                            medium: {
                                res: '360',
                                label: '360p',
                                yt: 'medium'
                            },
                            small: {
                                res: '240p',
                                label: '240p',
                                yt: 'small'
                            },
                            tiny: {
                                res: '144p',
                                label: '144p',
                                yt: 'tiny'
                            },
                            auto: {
                                res: 'auto',
                                label: 'auto',
                                yt: 'default'
                            }
                        };
                        var _sources = [];
                        qualities.map(function (q) {
                            _sources.push({
                                src: player.src().src,
                                type: player.src().type,
                                label: _yts[q].label,
                                res: _yts[q].res,
                                _yt: _yts[q].yt
                            })
                        });
                        groupedSrc = bucketSources(_sources);
                        var _customSourcePicker = function (_player, _sources, _label) {
                            var ytstate = player.tech_.ytPlayer.getPlayerState();
                            var cTime = player.tech_.ytPlayer.getCurrentTime();
                            if (ytstate != -1 && ytstate != 5) {
                                player.tech_.ytPlayer.stopVideo()
                            }
                            player.tech_.ytPlayer.setPlaybackQuality(_sources[0]._yt);
                            var cquality = player.tech_.ytPlayer.getPlaybackQuality();
                            player.tech_.ytPlayer.seekTo(cTime, !0);
                            if (ytstate == 1) player.tech_.ytPlayer.playVideo();
                            return player
                        };
                        var autobtn = groupedSrc.label.large;
                        var autores = '480p';
                        if (cquality == 'highres') {
                            autores = '1080p';
                            autobtn = groupedSrc.label.highres
                        }
                        if (cquality == 'hd1080') {
                            autores = '1080p';
                            autobtn = groupedSrc.label.hd1080
                        }
                        if (cquality == 'hd720') {
                            autores = '720p';
                            autobtn = groupedSrc.label.hd720
                        }
                        if (cquality == 'large') {
                            autores = '480p';
                            autobtn = groupedSrc.label.large
                        }
                        if (cquality == 'medium') {
                            autores = '360p';
                            autobtn = groupedSrc.label.medium
                        }
                        if (cquality == 'small') {
                            autores = '240p';
                            autobtn = groupedSrc.label.small
                        }
                        if (cquality == 'tiny') {
                            autores = '144p';
                            autobtn = groupedSrc.label.tiny
                        }
                        var choosen = {
                            label: autores,
                            res: autores,
                            sources: autobtn
                        };
                        var menuButton = new ResolutionMenuButton(player, {
                            sources: groupedSrc,
                            initialySelectedLabel: choosen.label,
                            initialySelectedRes: choosen.res,
                            customSourcePicker: _customSourcePicker
                        }, settings, label);
                        menuButton.el().classList.add('vjs-resolution-button');
                        if (player.controlBar.settingsButton) {
                            player.controlBar.resolutionSwitcher = player.controlBar.el_.insertBefore(menuButton.el_, player.controlBar.settingsButton.el_)
                        } else {
                            player.controlBar.resolutionSwitcher = player.controlBar.el_.insertBefore(menuButton.el_, player.controlBar.getChild('fullscreenToggle').el_)
                        }
                        videojs.options.ytnoload = !0;
                        videojs.options.ytSource = player.currentSrc()
                    } catch (e) {}
                })
            }
            player.ready(function () {
                if (player.options_.sources.length > 1) {
                    player.updateSrc(player.options_.sources)
                }
                if (player.techName_ === 'Youtube') {
                    initResolutionForYt(player)
                }
            })
        };
        // register the plugin
        videojs.registerPlugin('videoJsResolutionSwitcher', videoJsResolutionSwitcher);
    })(window, videojs);
})();
